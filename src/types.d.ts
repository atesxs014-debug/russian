declare module '@fugood/react-native-audio-pcm-stream' {
  type Options = { sampleRate: number; channels: number; bitsPerSample: number; audioSource?: number; bufferSize?: number; wavFile?: string };
  const AudioRecord: {
    init(options: Options): void;
    start(): void;
    stop(): void;
    on(event: 'data', cb: (base64: string) => void): { remove(): void };
  };
  export default AudioRecord;
}

declare module '*.bin' {
  const asset: number;
  export default asset;
}
