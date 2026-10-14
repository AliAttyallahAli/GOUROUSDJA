// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaUser, FaPhone, FaMapMarkerAlt, FaCity, FaKey,
    FaCopy, FaEye, FaEyeSlash, FaWallet, FaEnvelope,
    FaEdit, FaSave, FaTimes, FaSpinner, FaCalendarAlt,
    FaIdCard, FaUpload, FaCheckCircle,
    FaShieldAlt, FaClock,
    FaWhatsapp, FaTelegram, FaEnvelope as FaMail,
    FaFacebook, FaGift, FaUsers, FaChartLine, FaQrcode,
    FaLink, FaCrown,
    FaBuilding
} from 'react-icons/fa';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function Profile({ user }) {
    const [profile, setProfile] = useState(null);
    const [balance, setBalance] = useState(0);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [provinces, setProvinces] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // États parrainage
    const [referralCode, setReferralCode] = useState('');
    const [referralLink, setReferralLink] = useState('');
    const [referralQrUrl, setReferralQrUrl] = useState('');
    const [referralStats, setReferralStats] = useState({
        totalReferrals: 0,
        totalBonus: 0,
        pendingBonus: 0,
        referrals: []
    });
    const [referralCopied, setReferralCopied] = useState(false);
    const [showReferralQR, setShowReferralQR] = useState(false);

    // États KYC
    const [kycStatus, setKycStatus] = useState({
        status: 'pending',
        level: 1,
        submittedAt: null,
        verifiedAt: null,
        documents: []
    });
    const [showKycModal, setShowKycModal] = useState(false);
    const [kycLevel, setKycLevel] = useState(1);
    const [kycForm, setKycForm] = useState({
        fullname: '',
        birthDate: '',
        birthPlace: '',
        nationality: 'Tchadienne',
        idType: 'cni',
        idNumber: '',
        idIssueDate: '',
        idExpiryDate: '',
        address: '',
        occupation: '',
        phoneNumber: '',
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        businessType: '',
        registrationNumber: '',
        taxId: '',
        position: '',
        additionalInfo: ''
    });
    const [selectedFiles, setSelectedFiles] = useState({
        idFront: null,
        idBack: null,
        selfie: null,
        proofOfAddress: null
    });
    const [uploadingKyc, setUploadingKyc] = useState(false);
    const [kycHistory, setKycHistory] = useState([]);

    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        city: '',
        address: '',
        province: ''
    });

    // ============================================
    // HELPERS
    // ============================================
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (user) {
            fetchProfile();
            fetchProvinces();
            fetchKycStatus();
            fetchKycHistory();
            fetchReferralInfo();
        }
    }, [user]);

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    const fetchProfile = async () => {
        try {
            const profileRes = await axios.get(
                `${API_URL}/api/user/me`,
                getAuthHeaders()
            ).catch(() => ({ data: null }));

            const balanceRes = await axios.get(
                `${API_URL}/api/wallet/balance`,
                getAuthHeaders()
            ).catch(() => ({ data: { balance: 0 } }));

            const userData = profileRes?.data?.user || profileRes?.data || user || {};

            console.log('📊 Profil chargé:', userData);

            const generatedCode = generateReferralCode(userData.phone || user?.phone);

            setProfile({
                id: userData.id,
                fullname: userData.fullname || user?.fullname || 'Utilisateur',
                phone: userData.phone || user?.phone || 'Non renseigné',
                email: userData.email || '',
                province: userData.province || "N'Djaména",
                city: userData.city || '',
                address: userData.address || '',
                private_key: '********',
                created_at: userData.created_at,
                referral_code: userData.referral_code || generatedCode
            });

            setFormData({
                fullname: userData.fullname || '',
                email: userData.email || '',
                city: userData.city || '',
                address: userData.address || '',
                province: userData.province || "N'Djaména"
            });

            setBalance(balanceRes?.data?.balance || 0);

            const code = userData.referral_code || generatedCode;
            setReferralCode(code);
            const link = `${window.location.origin}/register?ref=${code}`;
            setReferralLink(link);
            setReferralQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`);

        } catch (error) {
            console.error('❌ Erreur chargement profil:', error);

            const generatedCode = generateReferralCode(user?.phone);

            setProfile({
                fullname: user?.fullname || 'Utilisateur',
                phone: user?.phone || 'Non renseigné',
                email: user?.email || '',
                province: user?.province || "N'Djaména",
                city: user?.city || '',
                address: user?.address || '',
                private_key: '********',
                referral_code: generatedCode
            });

            setFormData({
                fullname: user?.fullname || '',
                email: user?.email || '',
                city: user?.city || '',
                address: user?.address || '',
                province: user?.province || "N'Djaména"
            });

            setBalance(0);
            setReferralCode(generatedCode);
            setReferralLink(`${window.location.origin}/register?ref=${generatedCode}`);
            setReferralQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/register?ref=${generatedCode}`)}`);
        } finally {
            setLoading(false);
        }
    };

    const generateReferralCode = (phone) => {
        if (!phone) return 'CASH' + Math.random().toString(36).substring(2, 8).toUpperCase();
        return `CASH${phone.slice(-6)}`;
    };

    const fetchReferralInfo = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/referral/stats`,
                getAuthHeaders()
            ).catch(() => ({ data: {} }));

            setReferralStats({
                totalReferrals: response.data?.totalReferrals || 0,
                totalBonus: response.data?.totalBonus || 0,
                pendingBonus: response.data?.pendingBonus || 0,
                referrals: response.data?.referrals || []
            });
        } catch (error) {
            console.error('⚠️ Erreur stats parrainage:', error);
        }
    };

    const fetchProvinces = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/provinces`)
                .catch(() => ({ data: [] }));
            if (Array.isArray(response.data)) {
                setProvinces(response.data);
            }
        } catch (error) {
            console.error('⚠️ Erreur provinces:', error);
        }
    };

    const fetchKycStatus = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/kyc/status`,
                getAuthHeaders()
            ).catch(() => ({ data: { status: 'none', level: 0, documents: [] } }));

            setKycStatus(response.data || { status: 'none', level: 0, documents: [] });

            if (response.data?.userData) {
                setKycForm(prev => ({
                    ...prev,
                    fullname: response.data.userData.fullname || '',
                    address: response.data.userData.address || '',
                    phoneNumber: response.data.userData.phone || ''
                }));
            }
        } catch (error) {
            console.error('⚠️ Erreur KYC:', error);
        }
    };

    const fetchKycHistory = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/kyc/history`,
                getAuthHeaders()
            ).catch(() => ({ data: [] }));
            setKycHistory(response.data || []);
        } catch (error) {
            console.error('⚠️ Erreur historique KYC:', error);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleEditChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleKycFormChange = (e) => {
        setKycForm({ ...kycForm, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFiles(prev => ({ ...prev, [field]: file }));
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await axios.put(
                `${API_URL}/api/user/profile`,
                {
                    fullname: formData.fullname,
                    email: formData.email,
                    city: formData.city,
                    address: formData.address,
                    province: formData.province
                },
                getAuthHeaders()
            );

            setProfile(prev => ({
                ...prev,
                fullname: formData.fullname,
                email: formData.email,
                city: formData.city,
                address: formData.address,
                province: formData.province
            }));

            setEditMode(false);
            toast.success('✅ Profil mis à jour');

            const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
            savedUser.fullname = formData.fullname;
            localStorage.setItem('user', JSON.stringify(savedUser));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // KYC
    // ============================================
    const handleSubmitKyc = async (e) => {
        e.preventDefault();
        setUploadingKyc(true);

        try {
            // Niveau 2 : JSON
            if (kycLevel === 2) {
                const payload = {
                    fullname: kycForm.fullname,
                    birthDate: kycForm.birthDate,
                    birthPlace: kycForm.birthPlace,
                    nationality: kycForm.nationality,
                    idType: kycForm.idType,
                    idNumber: kycForm.idNumber,
                    idIssueDate: kycForm.idIssueDate,
                    idExpiryDate: kycForm.idExpiryDate,
                    address: kycForm.address,
                    occupation: kycForm.occupation,
                    phoneNumber: kycForm.phoneNumber,
                    companyName: kycForm.companyName,
                    companyAddress: kycForm.companyAddress,
                    companyPhone: kycForm.companyPhone,
                    companyEmail: kycForm.companyEmail,
                    businessType: kycForm.businessType,
                    registrationNumber: kycForm.registrationNumber,
                    taxId: kycForm.taxId,
                    position: kycForm.position,
                    additionalInfo: kycForm.additionalInfo
                };

                const response = await axios.post(
                    `${API_URL}/api/kyc/submit-level-2`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.success) {
                    toast.success('✅ Demande KYC niveau 2 soumise !');
                    setShowKycModal(false);
                    fetchKycStatus();
                    resetKycForm();
                }
                return;
            }

            // Niveau 1 : FormData
            const formDataKyc = new FormData();

            formDataKyc.append('fullname', kycForm.fullname);
            formDataKyc.append('birthDate', kycForm.birthDate);
            formDataKyc.append('birthPlace', kycForm.birthPlace);
            formDataKyc.append('nationality', kycForm.nationality);
            formDataKyc.append('idType', kycForm.idType);
            formDataKyc.append('idNumber', kycForm.idNumber);
            formDataKyc.append('idIssueDate', kycForm.idIssueDate);
            formDataKyc.append('idExpiryDate', kycForm.idExpiryDate);
            formDataKyc.append('address', kycForm.address);
            formDataKyc.append('occupation', kycForm.occupation);
            formDataKyc.append('phoneNumber', kycForm.phoneNumber);

            if (selectedFiles.idFront) formDataKyc.append('idFront', selectedFiles.idFront);
            if (selectedFiles.idBack) formDataKyc.append('idBack', selectedFiles.idBack);
            if (selectedFiles.selfie) formDataKyc.append('selfie', selectedFiles.selfie);
            if (selectedFiles.proofOfAddress) formDataKyc.append('proofOfAddress', selectedFiles.proofOfAddress);

            await axios.post(
                `${API_URL}/api/kyc/submit`,
                formDataKyc,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            toast.success('✅ Documents KYC soumis');
            setShowKycModal(false);
            fetchKycStatus();
            fetchKycHistory();

            setSelectedFiles({
                idFront: null,
                idBack: null,
                selfie: null,
                proofOfAddress: null
            });

        } catch (error) {
            console.error('❌ Erreur KYC:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la soumission');
        } finally {
            setUploadingKyc(false);
        }
    };

    const resetKycForm = () => {
        setKycForm({
            fullname: '',
            birthDate: '',
            birthPlace: '',
            nationality: 'Tchadienne',
            idType: 'cni',
            idNumber: '',
            idIssueDate: '',
            idExpiryDate: '',
            address: '',
            occupation: '',
            phoneNumber: '',
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            businessType: '',
            registrationNumber: '',
            taxId: '',
            position: '',
            additionalInfo: ''
        });
    };

    const openKycModal = (level) => {
        setKycLevel(level);
        setKycForm(prev => ({
            ...prev,
            fullname: profile?.fullname || '',
            phoneNumber: profile?.phone || '',
            address: profile?.address || ''
        }));
        setShowKycModal(true);
    };

    // ============================================
    // COPIE
    // ============================================
    const safeCopyToClipboard = (text, label) => {
        if (!text) {
            toast.error('Aucune information à copier');
            return;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => toast.success(`✅ ${label} copié`))
                .catch(() => fallbackCopy(text, label));
        } else {
            fallbackCopy(text, label);
        }
    };

    const fallbackCopy = (text, label) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            toast.success(`✅ ${label} copié`);
        } catch {
            toast.error(`Impossible de copier ${label}`);
        }
        document.body.removeChild(textArea);
    };

    const copyReferralLink = () => {
        safeCopyToClipboard(referralLink, 'Lien');
        setReferralCopied(true);
        setTimeout(() => setReferralCopied(false), 3000);
    };

    const copyReferralCode = () => {
        safeCopyToClipboard(referralCode, 'Code');
        setReferralCopied(true);
        setTimeout(() => setReferralCopied(false), 3000);
    };

    const copyToClipboard = (text, label) => safeCopyToClipboard(text, label);

    const shareReferral = (platform) => {
        const message = `🌟 Rejoignez CashPays ! Utilisez mon code : ${referralCode}\n\n${referralLink}\n\nChaque parrainage rapporte 500 FCFA ! 💰`;

        const urls = {
            whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Rejoignez CashPays !')}`,
            email: `mailto:?subject=${encodeURIComponent('Rejoignez CashPays')}&body=${encodeURIComponent(message)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
        };

        if (urls[platform]) {
            window.open(urls[platform], '_blank');
        }
    };

    // ============================================
    // HELPERS UI
    // ============================================
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const getKycStatusBadge = () => {
        const status = kycStatus?.status || 'none';
        const level = kycStatus?.level || 0;

        switch (status) {
            case 'verified':
                if (level >= 2) {
                    return {
                        color: 'bg-purple-500/20 text-purple-400',
                        text: `Vérifié Niveau ${level} ⭐`,
                        icon: FaCrown
                    };
                }
                return {
                    color: 'bg-green-500/20 text-green-400',
                    text: `Vérifié Niveau ${level}`,
                    icon: FaCheckCircle
                };
            case 'pending':
                return {
                    color: 'bg-yellow-500/20 text-yellow-400',
                    text: 'En attente',
                    icon: FaClock
                };
            case 'rejected':
                return {
                    color: 'bg-red-500/20 text-red-400',
                    text: 'Rejeté',
                    icon: FaTimes
                };
            default:
                return {
                    color: 'bg-gray-500/20 text-gray-400',
                    text: 'Non soumis',
                    icon: FaIdCard
                };
        }
    };

    const kycBadge = getKycStatusBadge();
    const KycIcon = kycBadge.icon;

    if (loading) {
        return (
            <Layout user={user}>
                <div className="flex justify-center items-center h-64">
                    <FaSpinner className="animate-spin text-4xl text-white" />
                </div>
            </Layout>
        );
    }

    // ============================================
    // RENDU
    // ============================================
    return (
        <Layout user={user}>

            {/* Solde */}
            <div className="card bg-gradient-to-r from-blue-600 to-blue-700 mb-6">
                <div className="text-center">
                    <div className="inline-flex p-3 bg-white/20 rounded-full mb-3">
                        <FaWallet className="text-white text-2xl" />
                    </div>
                    <p className="text-white/80 text-sm">Mon portefeuille</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white my-2">
                        {balance.toLocaleString()} FCFA
                    </h2>
                    <p className="text-white/60 text-sm">Solde disponible</p>
                </div>
            </div>

            {/* Parrainage */}
            <div className="card mb-6 bg-gradient-to-r from-purple-600 to-purple-700">
                <div className="text-center mb-4">
                    <div className="inline-flex p-3 bg-white/20 rounded-full mb-3">
                        <FaGift className="text-white text-2xl" />
                    </div>
                    <h3 className="text-white text-xl font-bold">Programme de parrainage</h3>
                    <p className="text-purple-100 text-sm">Parrainez et gagnez 500 FCFA par inscription !</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                        <FaUsers className="text-purple-200 mx-auto mb-1" />
                        <p className="text-white font-bold text-xl">{referralStats.totalReferrals}</p>
                        <p className="text-white/60 text-xs">Parrainages</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                        <FaChartLine className="text-purple-200 mx-auto mb-1" />
                        <p className="text-white font-bold text-xl">{referralStats.totalBonus.toLocaleString()} F</p>
                        <p className="text-white/60 text-xs">Gagnés</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                        <FaClock className="text-purple-200 mx-auto mb-1" />
                        <p className="text-white font-bold text-xl">{referralStats.pendingBonus.toLocaleString()} F</p>
                        <p className="text-white/60 text-xs">En attente</p>
                    </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3 mb-3">
                    <p className="text-white/60 text-xs mb-1">Votre code de parrainage</p>
                    <div className="flex items-center gap-2">
                        <code className="bg-white/20 rounded-lg px-3 py-2 text-white font-mono text-lg flex-1 text-center">
                            {referralCode}
                        </code>
                        <button
                            onClick={copyReferralCode}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition"
                        >
                            {referralCopied ? <FaCheckCircle /> : <FaCopy />}
                        </button>
                        <button
                            onClick={() => setShowReferralQR(!showReferralQR)}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition"
                        >
                            <FaQrcode />
                        </button>
                    </div>
                </div>

                {showReferralQR && (
                    <div className="bg-white/10 rounded-xl p-4 mb-3 text-center">
                        <img
                            src={referralQrUrl}
                            alt="QR Code"
                            className="w-32 h-32 mx-auto bg-white p-2 rounded-lg"
                        />
                    </div>
                )}

                <div className="bg-white/10 rounded-xl p-3 mb-3">
                    <p className="text-white/60 text-xs mb-1">Votre lien de parrainage</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={referralLink}
                            readOnly
                            className="bg-white/20 rounded-lg px-3 py-2 text-white text-sm flex-1 font-mono truncate"
                        />
                        <button
                            onClick={copyReferralLink}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition"
                        >
                            <FaLink />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => shareReferral('whatsapp')}
                        className="bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                    >
                        <FaWhatsapp size={14} />
                    </button>
                    <button
                        onClick={() => shareReferral('telegram')}
                        className="bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                    >
                        <FaTelegram size={14} />
                    </button>
                    <button
                        onClick={() => shareReferral('email')}
                        className="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                    >
                        <FaMail size={14} />
                    </button>
                    <button
                        onClick={() => shareReferral('facebook')}
                        className="bg-[#1877f2]/20 hover:bg-[#1877f2]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                    >
                        <FaFacebook size={14} />
                    </button>
                </div>
            </div>

            {/* KYC Status */}
            <div className="card mb-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${kycBadge.color}`}>
                            <KycIcon className="text-xl" />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Statut KYC</p>
                            <p className={`font-semibold ${kycBadge.color.split(' ')[1]}`}>
                                {kycBadge.text}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {kycStatus?.level === 1 && kycStatus?.status === 'verified' && (
                            <button
                                onClick={() => openKycModal(2)}
                                className="text-sm flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg"
                            >
                                <FaCrown className="text-yellow-400" /> Niveau 2
                            </button>
                        )}
                        {kycStatus?.status !== 'verified' && (
                            <button
                                onClick={() => openKycModal(1)}
                                className="text-sm flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
                            >
                                <FaIdCard /> Vérifier
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Infos personnelles */}
            <div className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-xl font-semibold">
                        <FaUser className="inline mr-2" /> Informations personnelles
                    </h3>
                    {!editMode ? (
                        <button
                            onClick={() => setEditMode(true)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                        >
                            <FaEdit size={14} /> Modifier
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditMode(false)}
                                className="text-white/50 hover:text-white"
                            >
                                <FaTimes size={16} />
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm"
                            >
                                {saving ? <FaSpinner className="animate-spin" /> : <FaSave size={14} />}
                                Sauvegarder
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Nom */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <FaUser className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white/50 text-xs">Nom complet</p>
                                {editMode ? (
                                    <input
                                        type="text"
                                        name="fullname"
                                        value={formData.fullname}
                                        onChange={handleEditChange}
                                        className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.fullname}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <FaEnvelope className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white/50 text-xs">Email</p>
                                {editMode ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleEditChange}
                                        className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.email || 'Non renseigné'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Téléphone */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <FaPhone className="text-blue-400" />
                            <div>
                                <p className="text-white/50 text-xs">Téléphone</p>
                                <p className="text-white font-medium">{profile?.phone}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => copyToClipboard(profile?.phone, 'Numéro')}
                            className="text-white/40 hover:text-white"
                        >
                            <FaCopy size={14} />
                        </button>
                    </div>

                    {/* Province */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <FaMapMarkerAlt className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white/50 text-xs">Province</p>
                                {editMode ? (
                                    <select
                                        name="province"
                                        value={formData.province}
                                        onChange={handleEditChange}
                                        className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                                    >
                                        <option value="">Sélectionnez</option>
                                        {provinces.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-white font-medium">{profile?.province}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ville */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <FaCity className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white/50 text-xs">Ville</p>
                                {editMode ? (
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleEditChange}
                                        className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.city || 'Non renseignée'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Adresse */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <FaMapMarkerAlt className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white/50 text-xs">Adresse</p>
                                {editMode ? (
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleEditChange}
                                        className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                                        rows="2"
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.address || 'Non renseignée'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sécurité */}
            <div className="card">
                <h3 className="text-white text-xl font-semibold mb-4">
                    <FaKey className="inline mr-2" /> Sécurité
                </h3>

                <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                        ⚠️ Gardez votre clé privée confidentielle.
                    </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <FaKey className="text-blue-400" />
                        <div>
                            <p className="text-white/50 text-xs">Clé privée (6 chiffres)</p>
                            <div className="flex items-center gap-2">
                                <p className="text-white font-mono text-lg tracking-wider">
                                    {showPrivateKey ? profile?.private_key : '••••••'}
                                </p>
                                <button
                                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                                    className="text-white/40 hover:text-white"
                                >
                                    {showPrivateKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => copyToClipboard(profile?.private_key, 'Clé privée')}
                        className="text-white/40 hover:text-white"
                    >
                        <FaCopy size={14} />
                    </button>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <p className="text-blue-300 text-sm">
                        💡 Contactez l'administrateur au <strong className="text-white">62 78 73 07</strong>
                    </p>
                </div>
            </div>

            {/* MODAL KYC */}
            {showKycModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {kycLevel === 2 ? (
                                    <><FaCrown className="text-yellow-400" /> KYC Niveau 2</>
                                ) : (
                                    <><FaIdCard className="text-blue-400" /> Vérification d'identité</>
                                )}
                            </h3>
                            <button
                                onClick={() => setShowKycModal(false)}
                                className="text-white/60 hover:text-white p-2"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSubmitKyc} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Nom complet *</label>
                                        <input
                                            type="text"
                                            name="fullname"
                                            value={kycForm.fullname}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Téléphone *</label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={kycForm.phoneNumber}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Date de naissance *</label>
                                        <input
                                            type="date"
                                            name="birthDate"
                                            value={kycForm.birthDate}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Lieu de naissance *</label>
                                        <input
                                            type="text"
                                            name="birthPlace"
                                            value={kycForm.birthPlace}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Type de pièce *</label>
                                        <select
                                            name="idType"
                                            value={kycForm.idType}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                        >
                                            <option value="cni" className="text-gray-800">CNI</option>
                                            <option value="passeport" className="text-gray-800">Passeport</option>
                                            <option value="permis" className="text-gray-800">Permis</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm mb-1">Numéro de pièce *</label>
                                        <input
                                            type="text"
                                            name="idNumber"
                                            value={kycForm.idNumber}
                                            onChange={handleKycFormChange}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-1">Adresse *</label>
                                    <textarea
                                        name="address"
                                        value={kycForm.address}
                                        onChange={handleKycFormChange}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                        rows="2"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-1">Profession</label>
                                    <input
                                        type="text"
                                        name="occupation"
                                        value={kycForm.occupation}
                                        onChange={handleKycFormChange}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                    />
                                </div>

                                {/* Champs Niveau 2 */}
                                {kycLevel === 2 && (
                                    <div className="border-t border-white/10 pt-4 mt-4">
                                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                                            <FaBuilding className="text-purple-400" /> Entreprise
                                        </h4>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Nom entreprise *</label>
                                                <input
                                                    type="text"
                                                    name="companyName"
                                                    value={kycForm.companyName}
                                                    onChange={handleKycFormChange}
                                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Secteur</label>
                                                <select
                                                    name="businessType"
                                                    value={kycForm.businessType}
                                                    onChange={handleKycFormChange}
                                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                                >
                                                    <option value="" className="text-gray-800">Sélectionnez</option>
                                                    <option value="Technologie" className="text-gray-800">Technologie</option>
                                                    <option value="Commerce" className="text-gray-800">Commerce</option>
                                                    <option value="Services" className="text-gray-800">Services</option>
                                                    <option value="Industrie" className="text-gray-800">Industrie</option>
                                                    <option value="Autre" className="text-gray-800">Autre</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-white/70 text-sm mb-1">Adresse entreprise *</label>
                                            <input
                                                type="text"
                                                name="companyAddress"
                                                value={kycForm.companyAddress}
                                                onChange={handleKycFormChange}
                                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                                required
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-white/70 text-sm mb-1">Poste *</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={kycForm.position}
                                                onChange={handleKycFormChange}
                                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Upload */}
                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="text-white font-semibold mb-3">Documents</h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {[
                                            { field: 'idFront', label: 'CNI Recto' },
                                            { field: 'idBack', label: 'CNI Verso' },
                                            { field: 'selfie', label: 'Selfie' },
                                            { field: 'proofOfAddress', label: 'Justificatif' }
                                        ].map(({ field, label }) => (
                                            <div key={field} className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => handleFileChange(e, field)}
                                                    className="hidden"
                                                    id={field}
                                                />
                                                <label htmlFor={field} className="cursor-pointer flex flex-col items-center gap-2">
                                                    <FaUpload className="text-blue-400 text-2xl" />
                                                    <span className="text-white/60 text-sm">{label}</span>
                                                    {selectedFiles[field] && (
                                                        <span className="text-green-400 text-xs">
                                                            <FaCheckCircle /> {selectedFiles[field].name.slice(0, 20)}
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowKycModal(false)}
                                        className="flex-1 bg-white/10 border border-white/20 text-white py-2 rounded-lg hover:bg-white/20"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploadingKyc}
                                        className={`flex-1 ${kycLevel === 2 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
                                    >
                                        {uploadingKyc ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                        {uploadingKyc ? 'Envoi...' : 'Soumettre'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default Profile;