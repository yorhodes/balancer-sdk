import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { SOR, SubgraphPoolBase } from 'sor-linear';

import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapType, QueryWithSorInput, QueryWithSorOutput, BatchSwap } from './types';
import { queryBatchSwap, queryBatchSwapWithSor } from './queryBatchSwap';
import { balancerVault } from '../constants/contracts';
import { getLimitsForSlippage } from './helpers';

import vaultAbi from '../abi/Vault.json';

export class SwapsService {
    network: Network;
    rpcUrl: string;
    sor: SOR;

    constructor(config: ConfigSdk) {
        this.network = config.network;
        this.rpcUrl = config.rpcUrl;
        const provider = new JsonRpcProvider(this.rpcUrl);
        this.sor = new SOR(provider, this.network, config.subgraphUrl);
    }

    static getLimitsForSlippage(
        tokensIn: string[],
        tokensOut: string[],
        swapType: SwapType,
        deltas: string[],
        assets: string[],
        slippage: string
    ): string[] {
        // TO DO - Check best way to do this?
        const limits = getLimitsForSlippage(
            tokensIn,
            tokensOut,
            swapType,
            deltas,
            assets,
            slippage
        );

        return limits.map(l => l.toString());
    }

    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools(
        poolsData: SubgraphPoolBase[] = [],
        isOnChain = true
    ): Promise<boolean> {
        return this.sor.fetchPools(poolsData, isOnChain);
    }

    /**
     * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
     * @param batchSwap - BatchSwap information used for query.
     * @param {SwapType} batchSwap.kind - either exactIn or exactOut.
     * @param {BatchSwapStep[]} batchSwap.swaps - sequence of swaps.
     * @param {string[]} batchSwap.assets - array contains the addresses of all assets involved in the swaps.
     * @returns {Promise<string[]>} Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
     * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
     * the same index in the `assets` array.
     */
    async queryBatchSwap(
        batchSwap: Pick<BatchSwap, 'kind' | 'swaps' | 'assets'>
    ): Promise<string[]> {
        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwap(
            vaultContract,
            batchSwap.kind,
            batchSwap.swaps,
            batchSwap.assets
        );
    }

    /**
     * Uses SOR to create and query a batchSwap.
     * @param {QueryWithSorInput} queryWithSor - Swap information used for querying using SOR.
     * @param {string[]} queryWithSor.tokensIn - Array of addresses of assets in.
     * @param {string[]} queryWithSor.tokensOut - Array of addresses of assets out.
     * @param {SwapType} queryWithSor.swapType - Type of Swap, ExactIn/Out.
     * @param {string[]} queryWithSor.amounts - Array of amounts used in swap.
     * @param {FetchPoolsInput} queryWithSor.fetchPools - Set whether SOR will fetch updated pool info.
     * @returns {Promise<QueryWithSorOutput>} Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
     */
    async queryBatchSwapWithSor(queryWithSor: QueryWithSorInput): Promise<QueryWithSorOutput> {
        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwapWithSor(
            this.sor,
            vaultContract,
            queryWithSor
        );
    }
}
