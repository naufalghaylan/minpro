declare module 'voucher-code-generator' {
  type GenerateOptions = {
    count?: number;
    length?: number;
    charset?: string;
    prefix?: string;
    postfix?: string;
    pattern?: string;
  };

  const voucherCodeGenerator: {
    generate: (config?: GenerateOptions, sequenceOffset?: number) => string[];
    charset: (name: 'numbers' | 'alphabetic' | 'alphanumeric') => string;
  };

  export default voucherCodeGenerator;
}