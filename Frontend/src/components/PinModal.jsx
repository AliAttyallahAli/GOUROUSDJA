// src/components/PinModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaKey, FaTimes, FaCheckCircle, FaShieldAlt, FaSpinner, FaLock, FaUnlock } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function PinModal({ isOpen, onClose, onSuccess, type = 'verify', amount }) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const inputRef = useRef(null);

    // Reset à la fermeture
    useEffect(() => {
        if (!isOpen) {
            setPin('');
            setConfirmPin('');
            setStep(1);
            setError('');
            setLoading(false);
            setShake(false);
        } else {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Animation shake à chaque erreur
    useEffect(() => {
        if (error) {
            setShake(true);
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [error]);

    if (!isOpen) return null;

    // ============================================
    // HELPERS
    // ============================================
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    // ============================================
    // VÉRIFIER PIN
    // ============================================
    const handleVerify = async () => {
        if (pin.length !== 4) {
            setError('Le PIN doit contenir 4 chiffres');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_URL}/api/user/verify-transaction-pin`,
                { pin },
                getAuthHeaders()
            );

            if (response.data.success) {
                onSuccess(pin);
                setPin('');
            }
        } catch (err) {
            console.error('❌ Erreur PIN:', err);
            let errorMessage = 'PIN incorrect';

            if (err.response?.status === 401) errorMessage = 'Code PIN incorrect';
            else if (err.response?.status === 403) errorMessage = 'Session expirée';
            else if (err.response?.status === 400) errorMessage = err.response?.data?.error || 'PIN invalide';
            else if (err.code === 'ERR_NETWORK') errorMessage = 'Erreur de connexion';

            setError(errorMessage);
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // DÉFINIR PIN
    // ============================================
    const handleSet = async () => {
        if (step === 1) {
            if (pin.length !== 4) {
                setError('Le PIN doit contenir 4 chiffres');
                return;
            }
            setConfirmPin(pin);
            setPin('');
            setStep(2);
            setError('');
            return;
        }

        if (pin !== confirmPin) {
            setError('Les PIN ne correspondent pas');
            setPin('');
            setConfirmPin('');
            setStep(1);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_URL}/api/user/set-pin`,
                { pin },
                getAuthHeaders()
            );

            if (response.data.success) {
                toast.success('✅ PIN défini avec succès');
                onSuccess(pin);
                setPin('');
                setConfirmPin('');
                setStep(1);
            }
        } catch (err) {
            console.error('❌ Erreur définition PIN:', err);
            let errorMessage = 'Erreur lors de la définition';

            if (err.response?.status === 401) errorMessage = 'Session expirée';
            else if (err.response?.status === 403) errorMessage = 'Accès refusé';
            else if (err.response?.status === 400) errorMessage = err.response?.data?.error || 'PIN invalide';
            else if (err.code === 'ERR_NETWORK') errorMessage = 'Erreur de connexion';

            setError(errorMessage);
            setPin('');
            setConfirmPin('');
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (type === 'verify') handleVerify();
        else handleSet();
    };

    const handlePinChange = (value) => {
        const clean = value.replace(/\D/g, '').slice(0, 4);
        setPin(clean);
        setError('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && pin.length === 4 && !loading) handleSubmit();
    };

    // ============================================
    // TITRES
    // ============================================
    const getTitle = () => {
        if (type === 'verify') return 'Code PIN';
        if (step === 1) return 'Créer un PIN';
        return 'Confirmer le PIN';
    };

    const getSubtitle = () => {
        if (type === 'verify') {
            return amount
                ? `Confirmez l'envoi de ${amount.toLocaleString()} FCFA`
                : 'Entrez votre code à 4 chiffres';
        }
        if (step === 1) return 'Choisissez un code à 4 chiffres';
        return 'Retapez votre code pour confirmer';
    };

    // ============================================
    // RENDU
    // ============================================
    return (
        <>
            {/* Animations CSS inline */}
            <style>{`
                @keyframes pinModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pinModalSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pinModalShake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
                @keyframes pinDotPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes pinGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
                }
                .pin-modal-overlay { animation: pinModalFadeIn 0.2s ease-out; }
                .pin-modal-card { animation: pinModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .pin-modal-card.shake { animation: pinModalShake 0.4s ease-in-out; }
                .pin-dot-pop { animation: pinDotPop 0.2s ease-out; }
                .pin-glow { animation: pinGlow 2s ease-in-out infinite; }
            `}</style>

            <div className="pin-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <div
                    className={`pin-modal-card relative max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden ${shake ? 'shake' : ''}`}
                    style={{
                        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        border: '1px solid rgba(96, 165, 250, 0.3)'
                    }}
                >

                    {/* Décorations de fond */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                    {/* HEADER */}
                    <div className="relative p-6 pb-4 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                type === 'verify'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                            } ${!loading && !error ? 'pin-glow' : ''}`}>
                                {type === 'verify'
                                    ? <FaLock className="text-white text-lg" />
                                    : <FaKey className="text-white text-lg" />
                                }
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-tight">
                                    {getTitle()}
                                </h3>
                                <p className="text-white/50 text-xs mt-0.5">
                                    {getSubtitle()}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>

                    {/* INDICATEUR D'ÉTAPE (set uniquement) */}
                    {type === 'set' && (
                        <div className="relative px-6 mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                                    step >= 1 ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-white/10'
                                }`} />
                                <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                                    step >= 2 ? 'bg-gradient-to-r from-purple-400 to-purple-300' : 'bg-white/10'
                                }`} />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className={`text-[10px] ${step >= 1 ? 'text-purple-300' : 'text-white/30'}`}>
                                    Saisie
                                </span>
                                <span className={`text-[10px] ${step >= 2 ? 'text-purple-300' : 'text-white/30'}`}>
                                    Confirmation
                                </span>
                            </div>
                        </div>
                    )}

                    {/* BODY */}
                    <div className="relative px-6 pb-6">

                        {/* Info banner */}
                        <div className={`rounded-2xl p-3 mb-5 flex items-center gap-2 ${
                            type === 'verify'
                                ? 'bg-blue-500/10 border border-blue-500/20'
                                : 'bg-purple-500/10 border border-purple-500/20'
                        }`}>
                            <FaShieldAlt className={`flex-shrink-0 ${
                                type === 'verify' ? 'text-blue-400' : 'text-purple-400'
                            }`} size={14} />
                            <p className={`text-xs ${
                                type === 'verify' ? 'text-blue-200' : 'text-purple-200'
                            }`}>
                                {amount && type === 'verify'
                                    ? `Confirmation sécurisée pour ${amount.toLocaleString()} FCFA`
                                    : 'Votre code PIN sécurise vos transactions'}
                            </p>
                        </div>

                        {/* Input PIN */}
                        <div className="relative mb-4">
                            <input
                                ref={inputRef}
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pin}
                                onChange={(e) => handlePinChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={4}
                                disabled={loading}
                                placeholder="••••"
                                className={`w-full px-4 py-5 rounded-2xl text-white text-center text-3xl font-mono tracking-[1rem] focus:outline-none transition-all duration-300 disabled:opacity-50 ${
                                    error
                                        ? 'bg-red-500/10 border-2 border-red-500/50 focus:border-red-400'
                                        : type === 'verify'
                                            ? 'bg-white/5 border-2 border-white/10 focus:border-blue-400 focus:bg-blue-500/5'
                                            : 'bg-white/5 border-2 border-white/10 focus:border-purple-400 focus:bg-purple-500/5'
                                }`}
                                style={{ textIndent: '0.5rem' }}
                            />

                            {/* Icône de statut à droite */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {loading ? (
                                    <FaSpinner className="animate-spin text-white/40" />
                                ) : error ? (
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <span className="text-red-400 text-xs">!</span>
                                    </div>
                                ) : pin.length === 4 ? (
                                    <FaCheckCircle className="text-green-400" />
                                ) : null}
                            </div>
                        </div>

                        {/* Points visuels */}
                        <div className="flex justify-center gap-3 mb-5">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`rounded-full transition-all duration-200 ${
                                        pin.length > i
                                            ? `w-3 h-3 ${type === 'verify' ? 'bg-blue-400' : 'bg-purple-400'} pin-dot-pop`
                                            : 'w-2.5 h-2.5 bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Erreur */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-red-400 text-xs font-bold">!</span>
                                </div>
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Boutons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-3.5 rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 font-medium border border-white/10"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || pin.length !== 4}
                                className={`flex-1 py-3.5 rounded-2xl text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    type === 'verify'
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30'
                                        : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/30'
                                } disabled:shadow-none`}
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span className="hidden sm:inline">Vérification...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaUnlock />
                                        <span>{type === 'verify' ? 'Valider' : step === 1 ? 'Suivant' : 'Confirmer'}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Lien PIN oublié */}
                        {type === 'verify' && (
                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        toast('Contactez l\'administrateur au 62 78 73 07', {
                                            icon: '🔑',
                                            duration: 5000,
                                            style: {
                                                background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                                                color: '#fff',
                                                border: '1px solid rgba(96, 165, 250, 0.3)'
                                            }
                                        });
                                    }}
                                    className="text-white/40 hover:text-white/70 text-xs transition-colors"
                                >
                                    PIN oublié ?
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default PinModal;