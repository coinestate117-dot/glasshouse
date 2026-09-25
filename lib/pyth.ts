import { HermesClient } from '@pythnetwork/hermes-client';

const HERMES_URL = 'https://hermes.pyth.network';
const client = new HermesClient(HERMES_URL, {});

export type PythPrice = {
  price: number;
  conf: number;
  publishTime: number;
};

/**
 * Fetch the feed ID for a given US Equity symbol from Pyth.
 * e.g., NVDA -> Equity.US.NVDA/USD
 */
export async function getFeedIdForSymbol(symbol: string): Promise<string | null> {
  try {
    const cleanSymbol = symbol.startsWith('x') ? symbol.slice(1) : symbol;
    const query = `Equity.US.${cleanSymbol.toUpperCase()}/USD`;
    
    // Use the raw fetch as it's easier to search price_feeds
    const res = await fetch(`${HERMES_URL}/v2/price_feeds?query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.length > 0) {
      // Find exact match just in case
      const match = data.find((feed: any) => feed.attributes.symbol === query);
      if (match) return match.id;
      return data[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error fetching Pyth feed ID for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetch the latest Pyth price for a specific feed ID.
 */
export async function getLatestPriceByFeedId(feedId: string): Promise<PythPrice | null> {
  try {
    const updates = await client.getLatestPriceUpdates([feedId]);
    if (updates && updates.parsed && updates.parsed.length > 0) {
      const priceData = updates.parsed[0].price;
      // Pyth prices are scaled by an exponent
      const actualPrice = Number(priceData.price) * Math.pow(10, priceData.expo);
      return {
        price: actualPrice,
        conf: Number(priceData.conf) * Math.pow(10, priceData.expo),
        publishTime: priceData.publish_time,
      };
    }
    return null;
  } catch (err) {
    console.error(`Error fetching Pyth price for feed ${feedId}:`, err);
    return null;
  }
}

/**
 * Fetch the latest Pyth price for a given stock symbol.
 */
export async function getPythPriceForSymbol(symbol: string): Promise<PythPrice | null> {
  const feedId = await getFeedIdForSymbol(symbol);
  if (!feedId) return null;
  return getLatestPriceByFeedId(feedId);
}
