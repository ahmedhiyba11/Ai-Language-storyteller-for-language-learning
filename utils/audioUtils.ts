function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext,
): Promise<AudioBuffer | null> {
    if (!base64Data) return null;
    
    try {
        const data = decodeBase64(base64Data);
        const dataInt16 = new Int16Array(data.buffer);
        const numChannels = 1; // Mono audio
        const frameCount = dataInt16.length / numChannels;
        const sampleRate = ctx.sampleRate; // Should be 24000 as per model output
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }
    
        return buffer;
    } catch(e) {
        console.error("Failed to decode audio data chunk", e);
        return null;
    }
}
