class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const configured =
      options.processorOptions?.inputSampleRate || sampleRate;
    const target =
      options.processorOptions?.targetSampleRate || 24000;
    this.ratio = configured / target;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input?.length) return true;

    const outputLength = Math.max(
      1,
      Math.floor(input.length / this.ratio),
    );
    const pcm16 = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i += 1) {
      const sourcePosition = i * this.ratio;
      const leftIndex = Math.floor(sourcePosition);
      const rightIndex = Math.min(leftIndex + 1, input.length - 1);
      const fraction = sourcePosition - leftIndex;
      const sample =
        (input[leftIndex] || 0) * (1 - fraction) +
        (input[rightIndex] || 0) * fraction;
      pcm16[i] = Math.max(
        -32768,
        Math.min(32767, Math.round(sample * 32767)),
      );
    }

    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);