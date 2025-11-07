export const formatCurrencyShort = (amount: number) => {
  if (amount === 0) return "$0";
  if (!amount || isNaN(amount)) return "$0";

  const absAmount = Math.abs(amount);

  const formatter = (value: number, suffix: string) => {
    return (amount < 0 ? "-" : "") + `$${value.toFixed(1)}${suffix}`;
  };

  if (absAmount >= 1_000_000_000) {
    return formatter(absAmount / 1_000_000_000, "b");
  } else if (absAmount >= 1_000_000) {
    return formatter(absAmount / 1_000_000, "m");
  } else if (absAmount >= 1_000) {
    return formatter(absAmount / 1_000, "k");
  } else {
    return `$${amount.toFixed(2)}`;
  }
};

export function generateOTP(len: number, alphabet: string = "1234567890") {
  let result = '';
  for (let i = 0; i < len; i++) {
      const x = Math.floor(Math.random() * alphabet.length)
      result += x;
  }
  return result;
};
