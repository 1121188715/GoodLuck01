/**
 * Vosk 语音识别封装
 * 优先使用 Vosk 离线识别，不可用时由 game.js 回退到 Web Speech API
 */
(function () {
  var cachedModel = null;
  var currentRecognizer = null;
  var currentStream = null;
  var currentContext = null;
  var lastResult = "";
  var lastPartial = "";

  function getModelUrl() {
    return (typeof window.VOSK_MODEL_URL !== "undefined" && window.VOSK_MODEL_URL)
      ? window.VOSK_MODEL_URL
      : "/models/model.tar.gz";
  }

  /**
   * 加载 Vosk 模型
   * @returns {Promise<{model: object}|null>} 成功返回 { model }，失败返回 null
   */
  function loadModel() {
    if (cachedModel) return Promise.resolve({ model: cachedModel });
    if (typeof window.Vosk === "undefined") return Promise.resolve(null);
    var url = getModelUrl();
    return window.Vosk.createModel(url)
      .then(function (model) {
        cachedModel = model;
        return { model: model };
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * 开始录音，使用 Vosk 识别
   * @param {object} model - Vosk 模型实例
   * @param {function(string)} onPartial - 部分结果回调
   * @param {function(string)} onResult - 最终结果回调
   * @returns {Promise<{stop: function}>} 返回 { stop }，调用 stop 停止录音
   */
  function startRecording(model, onPartial, onResult) {
    lastResult = "";
    lastPartial = "";
    /* 必须传入 16000，否则会 "Recognizer not ready, ignoring" 且无输出 */
    var recognizer = new model.KaldiRecognizer(16000);
    currentRecognizer = recognizer;

    recognizer.on("result", function (msg) {
      var text = (msg && msg.result && msg.result.text) ? msg.result.text : "";
      if (text) {
        lastResult = (lastResult ? lastResult + " " : "") + text;
        if (typeof onResult === "function") onResult(text);
      }
    });
    recognizer.on("partialresult", function (msg) {
      var text = (msg && msg.result && msg.result.partial) ? msg.result.partial : "";
      lastPartial = text;
      if (typeof onPartial === "function") onPartial(text);
    });

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 16000
      }
    }).then(function (stream) {
      currentStream = stream;
      var context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      currentContext = context;
      if (context.state === "suspended") {
        context.resume();
      }
      /* 若浏览器忽略 sampleRate，实际可能仍是 48kHz，需重采样到 16kHz 才能正确识别 */
      var inRate = context.sampleRate;
      var outRate = 16000;
      var needsResample = Math.abs(inRate - outRate) > 100;

      function to16kBuffer(buf) {
        if (!needsResample || buf.sampleRate === outRate) return buf;
        var ratio = buf.sampleRate / outRate;
        var inData = buf.getChannelData(0);
        var outLen = Math.floor(inData.length / ratio);
        var outBuf = context.createBuffer(1, outLen, outRate);
        var outData = outBuf.getChannelData(0);
        for (var i = 0; i < outLen; i++) {
          var idx = i * ratio;
          var j = Math.floor(idx);
          outData[i] = j < inData.length - 1
            ? inData[j] + (inData[j + 1] - inData[j]) * (idx - j)
            : inData[Math.min(j, inData.length - 1)];
        }
        return outBuf;
      }

      var processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = function (e) {
        if (currentRecognizer) {
          try {
            var buf = to16kBuffer(e.inputBuffer);
            currentRecognizer.acceptWaveform(buf);
          } catch (err) {
            console.warn("vosk acceptWaveform:", err);
          }
        }
      };
      var source = context.createMediaStreamSource(stream);
      source.connect(processor);
      var gain = context.createGain();
      gain.gain.value = 0;
      processor.connect(gain);
      gain.connect(context.destination);

      return {
        stop: function () {
          if (currentStream) {
            currentStream.getTracks().forEach(function (t) { t.stop(); });
            currentStream = null;
          }
          if (processor) {
            try { processor.disconnect(); } catch (err) {}
          }
          if (source) {
            try { source.disconnect(); } catch (err) {}
          }
          currentRecognizer = null;
        },
        getLastTranscript: function () {
          var r = lastResult || "";
          var p = lastPartial || "";
          return r ? (p ? r + " " + p : r) : p;
        }
      };
    }).catch(function () {
      currentRecognizer = null;
      return null;
    });
  }

  window.voskSpeech = {
    isAvailable: function () { return typeof window.Vosk !== "undefined"; },
    getModelUrl: getModelUrl,
    loadModel: loadModel,
    startRecording: startRecording
  };
})();
