import axios, { AxiosInstance } from 'axios';
import { Horizon, Networks } from '@stellar/stellar-sdk';

type Server = Horizon.Server;

export interface DefindexVault {
  address: string;
  name: string;
  symbol: string;
  totalAssets: string;
  totalSupply: string;
  apy: string;
  strategy: string;
  riskLevel: 'low' | 'medium' | 'high';
  underlyingTokens: string[];
  underlyingProtocols: string[];
  feeStructure: {
    managementFee: string;
    performanceFee: string;
  };
  performance?: {
    '7d': string;
    '30d': string;
    '90d': string;
    '1y': string;
  };
}

export interface DefindexStrategy {
  id: string;
  name: string;
  description: string;
  expectedApy: string;
  riskLevel: 'low' | 'medium' | 'high';
  protocols: string[];
  minDeposit?: string;
  maxDeposit?: string;
}

export interface DefindexPosition {
  vaultAddress: string;
  vaultName: string;
  shares: string;
  underlyingValue: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercent: string;
  depositedAt: string;
}

export interface DefindexAllocation {
  vaultAddress: string;
  vaultName: string;
  allocation: string;
  amount: string;
  expectedApy: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class DefindexClient {
  private apiClient: AxiosInstance;
  private horizonClient: Server;
  private network: Networks;
  private baseUrl: string;

  constructor(
    network: 'testnet' | 'mainnet' = 'testnet',
    apiKey?: string
  ) {
    this.baseUrl = 'https://api.defindex.io'; // This is a placeholder URL
    this.network = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    const horizonUrl = network === 'testnet' 
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';

    this.horizonClient = new Horizon.Server(horizonUrl);
  }

  async getAvailableVaults(
    riskLevel?: 'low' | 'medium' | 'high',
    minApy?: string
  ): Promise<DefindexVault[]> {
    try {
      const response = await this.apiClient.get('/api/vaults', {
        params: {
          ...(riskLevel && { riskLevel }),
          ...(minApy && { minApy })
        }
      });
      
      return response.data.vaults || [];
    } catch (error) {
      console.error('Error fetching available vaults:', error);
      // Fallback to mock data if API fails
      return this.getMockVaults(riskLevel, minApy);
    }
  }

  async getVaultDetails(vaultAddress: string): Promise<DefindexVault> {
    try {
      const response = await this.apiClient.get(`/api/vault/${vaultAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vault details:', error);
      // Fallback to mock data if API fails
      return this.getMockVaultDetails(vaultAddress);
    }
  }

  async getYieldStrategies(
    riskLevel?: 'low' | 'medium' | 'high',
    protocol?: string
  ): Promise<DefindexStrategy[]> {
    try {
      const response = await this.apiClient.get('/api/strategies', {
        params: {
          ...(riskLevel && { riskLevel }),
          ...(protocol && { protocol })
        }
      });
      
      return response.data.strategies || [];
    } catch (error) {
      console.error('Error fetching yield strategies:', error);
      // Fallback to mock data if API fails
      return this.getMockStrategies(riskLevel, protocol);
    }
  }

  async calculateVaultDeposit(
    vaultAddress: string,
    depositAmount: string,
    timeframe: string = '1y'
  ): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/vault/calculate', {
        vaultAddress,
        depositAmount,
        timeframe
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calculating vault deposit:', error);
      // Fallback to mock data if API fails
      return this.getMockDepositCalculation(vaultAddress, depositAmount, timeframe);
    }
  }

  async getPortfolioPerformance(
    userAddress: string,
    timeframe: string = '30d'
  ): Promise<any> {
    try {
      const response = await this.apiClient.get(`/api/portfolio/${userAddress}`, {
        params: { timeframe }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio performance:', error);
      // Fallback to mock data if API fails
      return this.getMockPortfolioPerformance(userAddress, timeframe);
    }
  }

  async getUserPositions(userAddress: string): Promise<DefindexPosition[]> {
    try {
      // First try to get from API
      const response = await this.apiClient.get(`/api/positions/${userAddress}`);
      return response.data.positions || [];
    } catch (error) {
      console.error('Error fetching user positions, trying Horizon fallback:', error);
      
      try {
        // Fallback to Horizon API to get user's account and positions
        const account = await this.horizonClient.loadAccount(userAddress);
        const balances = account.balances;
        
        // Filter for DeFindex vault tokens (this would need to be customized based on actual token structure)
        const vaultPositions = balances.filter((balance: any) => 
          balance.asset_type === 'credit_alphanum4' || 
          balance.asset_type === 'credit_alphanum12'
        );
        
        return vaultPositions.map((position: any) => ({
          vaultAddress: position.asset_issuer || 'unknown',
          vaultName: `${position.asset_code} Vault`,
          shares: position.balance,
          underlyingValue: position.balance, // Would need calculation
          entryPrice: '1.0',
          currentPrice: '1.0',
          pnl: '0',
          pnlPercent: '0',
          depositedAt: new Date().toISOString()
        }));
      } catch (horizonError) {
        console.error('Horizon API also failed:', horizonError);
        // Final fallback to mock data
        return this.getMockUserPositions(userAddress);
      }
    }
  }

  async optimizeYieldAllocation(
    totalAmount: string,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive',
    timeHorizon: string = '1y'
  ): Promise<{
    optimization: {
      totalAmount: string;
      riskTolerance: string;
      timeHorizon: string;
      recommendedAllocation: DefindexAllocation[];
      expectedPortfolioApy: string;
      diversificationScore: string;
    };
  }> {
    try {
      const response = await this.apiClient.post('/api/optimize', {
        totalAmount,
        riskTolerance,
        timeHorizon
      });
      
      return response.data;
    } catch (error) {
      console.error('Error optimizing yield allocation:', error);
      // Fallback to mock data if API fails
      return this.getMockOptimization(totalAmount, riskTolerance, timeHorizon);
    }
  }

  async getVaultAnalytics(
    vaultAddress: string,
    period: string = '30d'
  ): Promise<any> {
    try {
      const response = await this.apiClient.get(`/api/vault/${vaultAddress}/analytics`, {
        params: { period }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching vault analytics:', error);
      // Fallback to mock data if API fails
      return this.getMockVaultAnalytics(vaultAddress, period);
    }
  }

  // Mock data fallback methods
  private getMockVaults(riskLevel?: string, minApy?: string): DefindexVault[] {
    const mockVaults: DefindexVault[] = [
      {
        address: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
        name: 'Stellar Stable Yield Vault',
        symbol: 'SSYV',
        totalAssets: '1000000.0000000',
        totalSupply: '950000.0000000',
        apy: '8.5',
        strategy: 'USDC-XLM Liquidity Mining on Soroswap',
        riskLevel: 'low',
        underlyingTokens: ['USDC', 'XLM'],
        underlyingProtocols: ['Soroswap'],
        feeStructure: {
          managementFee: '1.0',
          performanceFee: '10.0'
        },
        performance: {
          '7d': '0.15',
          '30d': '0.68',
          '90d': '2.1',
          '1y': '8.5'
        }
      },
      {
        address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        name: 'Balanced Growth Vault',
        symbol: 'BGV',
        totalAssets: '500000.0000000',
        totalSupply: '480000.0000000',
        apy: '15.2',
        strategy: 'Multi-Protocol Yield Farming',
        riskLevel: 'medium',
        underlyingTokens: ['XLM', 'USDC', 'AQUA'],
        underlyingProtocols: ['Soroswap', 'Stellar DEX'],
        feeStructure: {
          managementFee: '1.5',
          performanceFee: '15.0'
        },
        performance: {
          '7d': '0.25',
          '30d': '1.2',
          '90d': '3.8',
          '1y': '15.2'
        }
      },
      {
        address: 'CAZNWAY5GKNZUY5QFPZJQY7JXDLWNXKXFKQ3KBQPG7QJLCZ7XQMDMCGL',
        name: 'High Yield Vault',
        symbol: 'HYV',
        totalAssets: '250000.0000000',
        totalSupply: '230000.0000000',
        apy: '25.7',
        strategy: 'Leveraged Yield Farming',
        riskLevel: 'high',
        underlyingTokens: ['XLM', 'AQUA'],
        underlyingProtocols: ['Soroswap', 'Lending Protocol'],
        feeStructure: {
          managementFee: '2.0',
          performanceFee: '20.0'
        },
        performance: {
          '7d': '0.45',
          '30d': '2.0',
          '90d': '6.4',
          '1y': '25.7'
        }
      }
    ];

    let filteredVaults = mockVaults;
    
    if (riskLevel) {
      filteredVaults = filteredVaults.filter(vault => vault.riskLevel === riskLevel);
    }
    
    if (minApy) {
      filteredVaults = filteredVaults.filter(vault => parseFloat(vault.apy) >= parseFloat(minApy));
    }

    return filteredVaults;
  }

  private getMockVaultDetails(vaultAddress: string): DefindexVault {
    const mockVaults = this.getMockVaults();
    return mockVaults.find(vault => vault.address === vaultAddress) || mockVaults[0];
  }

  private getMockStrategies(riskLevel?: string, protocol?: string): DefindexStrategy[] {
    const mockStrategies: DefindexStrategy[] = [
      {
        id: 'usdc-xlm-lp',
        name: 'USDC-XLM Liquidity Mining',
        description: 'Provide liquidity to USDC-XLM pool on Soroswap for stable yields',
        expectedApy: '8.5',
        riskLevel: 'low',
        protocols: ['Soroswap'],
        minDeposit: '100',
        maxDeposit: '1000000'
      },
      {
        id: 'multi-farm',
        name: 'Multi-Protocol Farming',
        description: 'Diversified farming across multiple DeFi protocols on Stellar',
        expectedApy: '15.2',
        riskLevel: 'medium',
        protocols: ['Soroswap', 'Stellar DEX', 'Aqua'],
        minDeposit: '500',
        maxDeposit: '500000'
      },
      {
        id: 'leveraged-yield',
        name: 'Leveraged Yield Farming',
        description: 'Leveraged positions in high-yield farming opportunities',
        expectedApy: '25.7',
        riskLevel: 'high',
        protocols: ['Soroswap', 'Lending Protocol'],
        minDeposit: '1000',
        maxDeposit: '100000'
      }
    ];

    let filteredStrategies = mockStrategies;
    
    if (riskLevel) {
      filteredStrategies = filteredStrategies.filter(strategy => strategy.riskLevel === riskLevel);
    }
    
    if (protocol) {
      filteredStrategies = filteredStrategies.filter(strategy => 
        strategy.protocols.some(p => p.toLowerCase().includes(protocol.toLowerCase()))
      );
    }

    return filteredStrategies;
  }

  private getMockDepositCalculation(vaultAddress: string, depositAmount: string, timeframe: string): any {
    const vault = this.getMockVaultDetails(vaultAddress);
    const apyMultiplier = timeframe === '1y' ? 1 : timeframe === '6m' ? 0.5 : 0.25;
    
    return {
      calculation: {
        vaultAddress,
        depositAmount,
        timeframe,
        expectedShares: (parseFloat(depositAmount) * 0.95).toString(),
        projectedValue: (parseFloat(depositAmount) * (1 + parseFloat(vault.apy) / 100 * apyMultiplier)).toString(),
        projectedYield: (parseFloat(depositAmount) * parseFloat(vault.apy) / 100 * apyMultiplier).toString(),
        fees: {
          depositFee: '0',
          managementFee: (parseFloat(depositAmount) * parseFloat(vault.feeStructure.managementFee) / 100).toString(),
          performanceFee: (parseFloat(depositAmount) * parseFloat(vault.apy) / 100 * parseFloat(vault.feeStructure.performanceFee) / 100).toString(),
        },
      }
    };
  }

  private getMockPortfolioPerformance(userAddress: string, timeframe: string): any {
    return {
      performance: {
        userAddress,
        timeframe,
        totalValue: '10000.0000000',
        totalInvested: '9500.0000000',
        totalPnl: '500.0000000',
        totalPnlPercent: '5.26',
        performanceByVault: [
          {
            vaultAddress: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
            vaultName: 'Stellar Stable Yield Vault',
            invested: '5000.0000000',
            currentValue: '5200.0000000',
            pnl: '200.0000000',
            pnlPercent: '4.0',
          },
          {
            vaultAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
            vaultName: 'Balanced Growth Vault',
            invested: '4500.0000000',
            currentValue: '4800.0000000',
            pnl: '300.0000000',
            pnlPercent: '6.67',
          },
        ],
      }
    };
  }

  private getMockUserPositions(userAddress: string): DefindexPosition[] {
    return [
      {
        vaultAddress: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
        vaultName: 'Stellar Stable Yield Vault',
        shares: '5000.0000000',
        underlyingValue: '5200.0000000',
        entryPrice: '1.0000000',
        currentPrice: '1.0400000',
        pnl: '200.0000000',
        pnlPercent: '4.0',
        depositedAt: '2024-01-01T00:00:00Z'
      },
      {
        vaultAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        vaultName: 'Balanced Growth Vault',
        shares: '4500.0000000',
        underlyingValue: '4800.0000000',
        entryPrice: '1.0000000',
        currentPrice: '1.0667000',
        pnl: '300.0000000',
        pnlPercent: '6.67',
        depositedAt: '2024-01-15T00:00:00Z'
      }
    ];
  }

  private getMockOptimization(
    totalAmount: string,
    riskTolerance: string,
    timeHorizon: string
  ): any {
    const allocations: DefindexAllocation[] = [];
    
    if (riskTolerance === 'conservative') {
      allocations.push({
        vaultAddress: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
        vaultName: 'Stellar Stable Yield Vault',
        allocation: '70',
        amount: (parseFloat(totalAmount) * 0.7).toString(),
        expectedApy: '8.5',
        riskLevel: 'low'
      });
      allocations.push({
        vaultAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        vaultName: 'Balanced Growth Vault',
        allocation: '30',
        amount: (parseFloat(totalAmount) * 0.3).toString(),
        expectedApy: '15.2',
        riskLevel: 'medium'
      });
    } else if (riskTolerance === 'moderate') {
      allocations.push({
        vaultAddress: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
        vaultName: 'Stellar Stable Yield Vault',
        allocation: '50',
        amount: (parseFloat(totalAmount) * 0.5).toString(),
        expectedApy: '8.5',
        riskLevel: 'low'
      });
      allocations.push({
        vaultAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        vaultName: 'Balanced Growth Vault',
        allocation: '50',
        amount: (parseFloat(totalAmount) * 0.5).toString(),
        expectedApy: '15.2',
        riskLevel: 'medium'
      });
    } else { // aggressive
      allocations.push({
        vaultAddress: 'CBQHNAXSI55GX2GN6D67GK7BHKQKQHX4J5DYKEN6PKVP7DTCMMY7XAQD',
        vaultName: 'Stellar Stable Yield Vault',
        allocation: '30',
        amount: (parseFloat(totalAmount) * 0.3).toString(),
        expectedApy: '8.5',
        riskLevel: 'low'
      });
      allocations.push({
        vaultAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGHJMUOB',
        vaultName: 'Balanced Growth Vault',
        allocation: '40',
        amount: (parseFloat(totalAmount) * 0.4).toString(),
        expectedApy: '15.2',
        riskLevel: 'medium'
      });
      allocations.push({
        vaultAddress: 'CAZNWAY5GKNZUY5QFPZJQY7JXDLWNXKXFKQ3KBQPG7QJLCZ7XQMDMCGL',
        vaultName: 'High Yield Vault',
        allocation: '30',
        amount: (parseFloat(totalAmount) * 0.3).toString(),
        expectedApy: '25.7',
        riskLevel: 'high'
      });
    }

    const expectedPortfolioApy = allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.allocation) / 100 * parseFloat(allocation.expectedApy));
    }, 0);

    return {
      optimization: {
        totalAmount,
        riskTolerance,
        timeHorizon,
        recommendedAllocation: allocations,
        expectedPortfolioApy: expectedPortfolioApy.toFixed(2),
        diversificationScore: '85'
      }
    };
  }

  private getMockVaultAnalytics(vaultAddress: string, period: string): any {
    const vault = this.getMockVaultDetails(vaultAddress);
    
    return {
      analytics: {
        vaultAddress,
        period,
        metrics: {
          totalReturn: vault.apy,
          volatility: '12.3',
          sharpeRatio: '1.2',
          maxDrawdown: '5.5',
          averageApy: vault.apy,
          totalDeposits: vault.totalAssets,
          totalWithdrawals: '50000.0000000',
          netFlow: (parseFloat(vault.totalAssets) - 50000).toString(),
        },
        performanceHistory: [
          { date: '2024-01-01', value: '100.0000000' },
          { date: '2024-01-15', value: '101.2000000' },
          { date: '2024-02-01', value: '102.8000000' },
          { date: '2024-02-15', value: '104.1000000' },
          { date: '2024-03-01', value: '105.5000000' },
        ],
        topPerformers: [
          { strategy: vault.strategy, contribution: '100%' },
        ],
      }
    };
  }
}