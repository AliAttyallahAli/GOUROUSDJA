// src/pages/MyTokens.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCoins, FaArrowLeft, FaSpinner, FaBox, FaPlus,
    FaTag, FaEye, FaChartLine, FaWallet, FaSync
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    if (data && Array.isArray(data.data)) return data.data;
    return [];
};

function MyTokens({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tokens, setTokens] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [marketTokens, setMarketTokens] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // ✅ Token helper
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user]);

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = getAuthHeaders();

            // ✅ Appels séparés avec await + catch individuel
            let myTokensData = [];
            let totalValueData = 0;
            let transactionsData = [];
            let marketData = [];

            // 1. Mes tokens
            try {
                const res = await axios.get(`${API_URL}/api/tokens/my-tokens`, headers);
                myTokensData = extractArray(res.data, 'tokens', 'data');
                totalValueData = res.data?.total_value || 0;
                console.log('📊 Mes tokens chargés:', myTokensData.length);
            } catch (err) {
                console.warn('⚠️ /api/tokens/my-tokens:', err.response?.status || err.message);
            }

            // 2. Mes transactions
            try {
                const res = await axios.get(`${API_URL}/api/tokens/my-transactions`, headers);
                transactionsData = extractArray(res.data, 'transactions', 'data');
                console.log('📋 Transactions chargées:', transactionsData.length);
            } catch (err) {
                console.warn('⚠️ /api/tokens/my-transactions:', err.response?.status || err.message);
            }

            // 3. Marché
            try {
                const res = await axios.get(`${API_URL}/api/tokens/market`, headers);
                marketData = extractArray(res.data, 'tokens', 'data');
                console.log('🏪 Marché chargé:', marketData.length);
            } catch (err) {
                console.warn('⚠️ /api/tokens/market:', err.response?.status || err.message);

                // Fallback : essayer /api/tokens
                try {
                    const res2 = await axios.get(`${API_URL}/api/tokens`, headers);
                    marketData = extractArray(res2.data, 'tokens', 'data');
                    console.log('🏪 Marché (fallback /api/tokens):', marketData.length);
                } catch (err2) {
                    console.warn('⚠️ /api/tokens aussi échoué:', err2.response?.status || err2.message);
                }
            }

            setTokens(myTokensData);
            setTotalValue(totalValueData);
            setTransactions(transactionsData);
            setMarketTokens(marketData);

        } catch (error) {
            console.error('❌ Erreur globale fetchData:', error);
            toast.error('Erreur chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
        toast.success('Actualisé');
    };

    // ============================================
    // HELPERS
    // ============================================
    const formatAmount = (amount) => {
        if (amount === null || amount === undefined) return '0 FCFA';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return '0 FCFA';
        return num.toLocaleString('fr-FR') + ' FCFA';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    // ============================================
    // CALCULS
    // ============================================
    const totalInvested = tokens.reduce((sum, t) => sum + (t.total_invested || 0), 0);
    const totalQuantity = tokens.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalCurrentValue = tokens.reduce(
        (sum, t) => sum + ((t.quantity || 0) * (t.current_price || 0)),
        0
    );
    const totalProfit = totalCurrentValue - totalInvested;

    if (!user) return null;

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">

            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] border-b border-blue-500/20 shadow-lg">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center flex-wrap gap-3">
                    <button
                        onClick={() => navigate('/token-market')}
                        className="flex items-center gap-2 text-white hover:text-blue-300 transition"
                    >
                        <FaArrowLeft /> Marché
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaBox /> Mes Tokens
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                        >
                            <FaSync className={refreshing ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => navigate('/token-market')}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            <FaPlus /> Acheter
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {loading ? (
                    <div className="text-center py-12">
                        <FaSpinner className="animate-spin text-4xl text-yellow-500 mx-auto mb-3" />
                        <p className="text-white/60">Chargement de votre portefeuille...</p>
                    </div>
                ) : (
                    <>
                        {/* STATS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <FaWallet /> Total investi
                                </p>
                                <p className="text-2xl font-bold text-purple-700">
                                    {formatAmount(totalInvested)}
                                </p>
                            </div>

                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <FaCoins /> Quantité totale
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {totalQuantity.toLocaleString()}
                                </p>
                            </div>

                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1">Valeur actuelle</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatAmount(totalCurrentValue)}
                                </p>
                            </div>

                            <div className={`rounded-xl p-5 shadow-lg ${
                                totalProfit >= 0
                                    ? 'bg-green-50 border-2 border-green-300'
                                    : 'bg-red-50 border-2 border-red-300'
                            }`}>
                                <p className="text-xs text-gray-500 mb-1">Gain / Perte</p>
                                <p className={`text-2xl font-bold ${
                                    totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {totalProfit >= 0 ? '+' : ''}{formatAmount(totalProfit)}
                                </p>
                            </div>
                        </div>

                        {/* MES TOKENS (PORTEFEUILLE) */}
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 text-white">
                                <h2 className="font-bold flex items-center gap-2">
                                    <FaChartLine /> Mon portefeuille ({tokens.length})
                                </h2>
                            </div>

                            {tokens.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <FaBox className="text-5xl mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Aucun token dans votre portefeuille</p>
                                    <p className="text-sm mb-4">Commencez par investir dans un token</p>
                                    <button
                                        onClick={() => navigate('/token-market')}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                    >
                                        Explorer le marché
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {tokens.map((token) => {
                                        const currentValue = (token.quantity || 0) * (token.current_price || 0);
                                        const profit = currentValue - (token.total_invested || 0);
                                        const profitPercent = token.total_invested > 0
                                            ? ((profit / token.total_invested) * 100).toFixed(2)
                                            : 0;

                                        return (
                                            <div
                                                key={token.id}
                                                onClick={() => navigate(`/token/${token.token_id}`)}
                                                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <span className="text-4xl">
                                                        {token.token_logo || '🪙'}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-800">
                                                            {token.token_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            {token.token_symbol}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {token.quantity} tokens • Prix moyen: {formatAmount(token.average_buy_price)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-bold text-purple-700 text-lg">
                                                        {formatAmount(currentValue)}
                                                    </p>
                                                    <p className={`text-xs font-medium ${
                                                        profit >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {profit >= 0 ? '▲' : '▼'} {formatAmount(Math.abs(profit))}
                                                        <span className="ml-1">
                                                            ({profit >= 0 ? '+' : ''}{profitPercent}%)
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Investi: {formatAmount(token.total_invested)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* HISTORIQUE DES TRANSACTIONS */}
                        {transactions.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                                    <h2 className="font-bold flex items-center gap-2">
                                        <FaTag /> Historique des transactions ({transactions.length})
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                    {transactions.slice(0, 20).map((tx) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-2xl ${
                                                    tx.type === 'buy' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {tx.type === 'buy' ? '📥' : '📤'}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-sm">
                                                        {tx.type === 'buy' ? 'Achat' : 'Vente'} de {tx.token_symbol}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {tx.quantity} tokens à {formatAmount(tx.price)}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-mono mt-1">
                                                        {formatDate(tx.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${
                                                    tx.type === 'buy' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    {tx.type === 'buy' ? '-' : '+'}{formatAmount(tx.total)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Frais: {formatAmount(tx.fee || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TOKENS DISPONIBLES SUR LE MARCHÉ */}
                        {marketTokens.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-4 text-white flex justify-between items-center">
                                    <h2 className="font-bold flex items-center gap-2">
                                        <FaCoins /> Tokens disponibles ({marketTokens.length})
                                    </h2>
                                    <button
                                        onClick={() => navigate('/token-market')}
                                        className="text-sm px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition"
                                    >
                                        Voir tout →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                    {marketTokens.slice(0, 6).map((token) => (
                                        <div
                                            key={token.id}
                                            onClick={() => navigate(`/token/${token.id}`)}
                                            className="border-2 border-gray-100 rounded-xl p-4 hover:border-purple-500 hover:bg-purple-50 transition cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="text-3xl">{token.logo || '🪙'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 truncate">
                                                        {token.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        {token.symbol}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Prix</span>
                                                <span className="font-bold text-purple-700">
                                                    {formatAmount(token.current_price)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs mt-2">
                                                <span className="text-gray-400">Disponible</span>
                                                <span className="text-gray-600">
                                                    {(token.available_supply || 0).toLocaleString()} tokens
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MESSAGE SI TOUT EST VIDE */}
                        {tokens.length === 0 && marketTokens.length === 0 && transactions.length === 0 && (
                            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
                                <FaBox className="text-6xl text-white/30 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">
                                    Aucune donnée disponible
                                </h2>
                                <p className="text-white/60 mb-4">
                                    Le système de tokens n'est pas encore configuré.
                                </p>
                                <button
                                    onClick={handleRefresh}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                >
                                    🔄 Réessayer
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default MyTokens;