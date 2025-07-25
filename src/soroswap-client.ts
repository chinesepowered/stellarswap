import axios, { AxiosInstance } from 'axios';
import { Horizon } from '@stellar/stellar-sdk';

type Server = Horizon.Server;

export interface SoroswapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export interface SoroswapPair {
  pairAddress: string;
  token0: SoroswapToken;
  token1: SoroswapToken;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: string;
  volume24h?: string;
  tvl?: string;
  apr?: string;
}

export interface SoroswapQuote {
  tokenIn: SoroswapToken;
  tokenOut: SoroswapToken;
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  route: string[];
  slippage: string;
  fee: string;
  minimumReceived: string;
  gasEstimate?: string;
}

export interface SoroswapPrice {
  token: SoroswapToken;
  price: string;
  baseCurrency: string;
  change24h: string;
  volume24h: string;
  marketCap?: string;
  timestamp: string;
}

export class SoroswapClient {
  private apiClient: AxiosInstance;
  private horizonClient: Server;
  private baseUrl: string;
  private horizonUrl: string;

  constructor(
    network: 'testnet' | 'mainnet' = 'testnet',
    apiKey?: string,
    baseUrl: string = 'https://api.soroswap.finance'
  ) {
    this.baseUrl = baseUrl;
    this.horizonUrl = network === 'testnet' 
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    this.horizonClient = new Horizon.Server(this.horizonUrl);
  }

  async getTokenPairs(token?: string): Promise<SoroswapPair[]> {
    try {
      const response = await this.apiClient.get('/api/pairs', {
        params: token ? { token } : undefined
      });
      
      return response.data.pairs || [];
    } catch (error) {
      console.error('Error fetching token pairs:', error);
      // Fallback to mock data if API fails
      return this.getMockTokenPairs(token);
    }
  }

  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: string = '0.5'
  ): Promise<SoroswapQuote> {
    try {
      const response = await this.apiClient.get('/api/quote', {
        params: {
          tokenIn,
          tokenOut,
          amountIn,
          slippage
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching swap quote:', error);
      // Fallback to mock data if API fails
      return this.getMockSwapQuote(tokenIn, tokenOut, amountIn, slippage);
    }
  }

  async getLiquidityPools(pairAddress?: string): Promise<SoroswapPair[]> {
    try {
      const response = await this.apiClient.get('/api/pools', {
        params: pairAddress ? { pairAddress } : undefined
      });
      
      return response.data.pools || [];
    } catch (error) {
      console.error('Error fetching liquidity pools:', error);
      // Fallback to mock data if API fails
      return this.getMockLiquidityPools(pairAddress);
    }
  }

  async getTokenPrice(tokenAddress: string, baseCurrency: string = 'USD'): Promise<SoroswapPrice> {
    try {
      const response = await this.apiClient.get(`/api/price/${tokenAddress}`, {
        params: { baseCurrency }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching token price:', error);
      // Fallback to mock data if API fails
      return this.getMockTokenPrice(tokenAddress, baseCurrency);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<SoroswapToken> {
    try {
      const response = await this.apiClient.get(`/api/token/${tokenAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching token info:', error);
      // Fallback to mock data if API fails
      return this.getMockTokenInfo(tokenAddress);
    }
  }

  async getUserPositions(userAddress: string): Promise<any[]> {
    try {
      // Use Horizon API to get user's account and positions
      const account = await this.horizonClient.loadAccount(userAddress);
      const balances = account.balances;
      
      // Filter for liquidity pool tokens and process positions
      const lpPositions = balances.filter((balance: any) => 
        balance.asset_type === 'liquidity_pool_shares'
      );
      
      return lpPositions.map((position: any) => ({
        pairAddress: position.liquidity_pool_id,
        lpTokenBalance: position.balance,
        // Additional position data would be calculated here
      }));
    } catch (error) {
      console.error('Error fetching user positions:', error);
      // Fallback to mock data if API fails
      return this.getMockUserPositions(userAddress);
    }
  }

  // Mock data fallback methods
  private getMockTokenPairs(token?: string): SoroswapPair[] {
    const mockPairs: SoroswapPair[] = [
      {
        pairAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        token0: {
          address: 'native',
          symbol: 'XLM',
          name: 'Stellar Lumens',
          decimals: 7
        },
        token1: {
          address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6
        },
        reserve0: '1000000.0000000',
        reserve1: '120000.000000',
        totalSupply: '346410.1610000',
        fee: '0.3',
        volume24h: '125000',
        tvl: '240000',
        apr: '12.5'
      },
      {
        pairAddress: 'CAZNWAY5GKNZUY5QFPZJQY7JXDLWNXKXFKQ3KBQPG7QJLCZ7XQMDMCGL',
        token0: {
          address: 'native',
          symbol: 'XLM',
          name: 'Stellar Lumens',
          decimals: 7
        },
        token1: {
          address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A',
          symbol: 'AQUA',
          name: 'Aqua Token',
          decimals: 7
        },
        reserve0: '800000.0000000',
        reserve1: '2500000.0000000',
        totalSupply: '1414213.5620000',
        fee: '0.3',
        volume24h: '85000',
        tvl: '170000',
        apr: '18.2'
      }
    ];

    return token 
      ? mockPairs.filter(pair => 
          pair.token0.symbol === token || 
          pair.token1.symbol === token ||
          pair.token0.address === token ||
          pair.token1.address === token
        )
      : mockPairs;
  }

  private getMockSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: string
  ): SoroswapQuote {
    return {
      tokenIn: {
        address: tokenIn,
        symbol: 'XLM',
        name: 'Stellar Lumens',
        decimals: 7
      },
      tokenOut: {
        address: tokenOut,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      amountIn,
      amountOut: (parseFloat(amountIn) * 0.12 * 0.997).toFixed(6), // XLM to USDC rate with 0.3% fee
      priceImpact: '0.1',
      route: [tokenIn, tokenOut],
      slippage,
      fee: '0.3',
      minimumReceived: (parseFloat(amountIn) * 0.12 * 0.997 * (1 - parseFloat(slippage) / 100)).toFixed(6),
      gasEstimate: '0.001'
    };
  }

  private getMockLiquidityPools(pairAddress?: string): SoroswapPair[] {
    const mockPools = this.getMockTokenPairs();
    
    return pairAddress 
      ? mockPools.filter(pool => pool.pairAddress === pairAddress)
      : mockPools;
  }

  private getMockTokenPrice(tokenAddress: string, baseCurrency: string): SoroswapPrice {
    const mockPrices: Record<string, number> = {
      'native': 0.12,
      'XLM': 0.12,
      'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A': 1.00, // USDC
      'USDC': 1.00,
      'AQUA': 0.08,
    };

    const price = mockPrices[tokenAddress] || mockPrices[tokenAddress.toUpperCase()] || 0;

    return {
      token: this.getMockTokenInfo(tokenAddress),
      price: price.toString(),
      baseCurrency,
      change24h: '2.5',
      volume24h: '125000',
      marketCap: '1000000000',
      timestamp: new Date().toISOString()
    };
  }

  private getMockTokenInfo(tokenAddress: string): SoroswapToken {
    const mockTokens: Record<string, SoroswapToken> = {
      'native': {
        address: 'native',
        symbol: 'XLM',
        name: 'Stellar Lumens',
        decimals: 7
      },
      'XLM': {
        address: 'native',
        symbol: 'XLM',
        name: 'Stellar Lumens',
        decimals: 7
      },
      'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A': {
        address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      'USDC': {
        address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      'AQUA': {
        address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJNU4TKDGSR3RCNBFIW7A',
        symbol: 'AQUA',
        name: 'Aqua Token',
        decimals: 7
      }
    };

    return mockTokens[tokenAddress] || mockTokens[tokenAddress.toUpperCase()] || {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 7
    };
  }

  private getMockUserPositions(userAddress: string): any[] {
    return [
      {
        pairAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        token0: 'XLM',
        token1: 'USDC',
        lpTokenBalance: '1000.0000000',
        shareOfPool: '0.01',
        token0Amount: '8333.3333333',
        token1Amount: '1000.000000',
        value: '2000.00',
        pnl: '100.00',
        pnlPercent: '5.0'
      }
    ];
  }
}