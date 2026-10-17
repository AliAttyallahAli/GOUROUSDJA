// src/pages/AdminPanel.jsx - Version COMPLÈTE ET CORRIGÉE
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaUsers, FaUserTie, FaMoneyBillWave, FaChartLine, FaBell,
    FaCog, FaKey, FaUserPlus, FaTimes, FaEye, FaEyeSlash, FaClock,
    FaBuilding, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaShieldAlt,
    FaCopy, FaBan, FaTrashAlt, FaEdit, FaPlus, FaNewspaper,
    FaSave, FaImage, FaIdCard, FaTag, FaCalendarAlt,
    FaEnvelope, FaUserCheck, FaFilePdf, FaUser, FaUserShield,
    FaLandmark, FaSync, FaLock, FaUnlockAlt, FaTimesCircle, FaUndo,
    FaSearch, FaPlane, FaWallet, FaSpinner, FaCheck,
    FaInfoCircle, FaUserCircle, FaReceipt, FaGlobe
} from 'react-icons/fa';
import Layout from '../components/Layout';
import AgentApplicationsManager from '../components/AgentApplicationsManager';
import AdminPinManagement from '../components/AdminPinManagement';
import AdminTaxes from './AdminTaxes';

// ✅ API_URL correct
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

// ============================================
// MODAL RÉUTILISABLE
// ============================================
const Modal = ({ isOpen, onClose, title, children, maxWidth = '2xl' }) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className={`relative max-w-${maxWidth} w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-yellow-500/30 my-8`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

function AdminPanel({ user, socket }) {
    const navigate = useNavigate();

    // ============================================
    // ÉTATS PRINCIPAUX
    // ============================================
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [agents, setAgents] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Recherche et filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals utilisateurs
    const [showUserModal, setShowUserModal] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [showEditAgentModal, setShowEditAgentModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showResetKeyModal, setShowResetKeyModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserForReset, setSelectedUserForReset] = useState(null);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [resettingKey, setResettingKey] = useState(false);
    const [passwordResetResult, setPasswordResetResult] = useState(null);
    const [resetResult, setResetResult] = useState(null);

    // ============================================
    // ENTREPRISES DE SERVICES (EAU/ÉLECTRICITÉ)
    // ============================================
    const [serviceCompanies, setServiceCompanies] = useState([]);
    const [companies, setCompanies] = useState([]); // Alias
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [creatingCompany, setCreatingCompany] = useState(false);
    const [createdCompany, setCreatedCompany] = useState(null);
    const [showCompanyPassword, setShowCompanyPassword] = useState(false);
    const [showCompanyConfirmPassword, setShowCompanyConfirmPassword] = useState(false);
    const [companyPage, setCompanyPage] = useState(1);
    const [companyFilters, setCompanyFilters] = useState({
        status: 'all',
        type: 'all',
        search: ''
    });
    const [companyStats, setCompanyStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        water: 0,
        electricity: 0,
        totalRevenue: 0,
        totalPayments: 0
    });

    const [companyForm, setCompanyForm] = useState({
        name: '',
        type: 'water',
        fullName: '',
        description: '',
        logo: '',
        contactPhone: '',
        contactEmail: '',
        address: '',
        color: '',
        password: '',
        confirmPassword: '',
        agentPhone: ''
    });

    // ============================================
    // AGENCES DE VOYAGE
    // ============================================
    const [travelAgencies, setTravelAgencies] = useState([]);
    const [travelAgenciesLoading, setTravelAgenciesLoading] = useState(false);
    const [showTravelAgencyModal, setShowTravelAgencyModal] = useState(false);
    const [showTravelAgencyDetailModal, setShowTravelAgencyDetailModal] = useState(false);
    const [editingTravelAgency, setEditingTravelAgency] = useState(null);
    const [selectedTravelAgencyDetail, setSelectedTravelAgencyDetail] = useState(null);
    const [creatingTravelAgency, setCreatingTravelAgency] = useState(false);
    const [createdTravelAgency, setCreatedTravelAgency] = useState(null);
    const [showTravelAgencyPassword, setShowTravelAgencyPassword] = useState(false);
    const [showTravelAgencyConfirmPassword, setShowTravelAgencyConfirmPassword] = useState(false);

    const [travelAgencyForm, setTravelAgencyForm] = useState({
        name: '',
        type: 'travel_agency',
        description: '',
        logo: '',
        phone: '',
        email: '',
        address: '',
        password: '',
        confirmPassword: ''
    });

    // ============================================
    // BLOG
    // ============================================
    const [blogPosts, setBlogPosts] = useState([]);
    const [blogLoading, setBlogLoading] = useState(false);
    const [showBlogForm, setShowBlogForm] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [savingPost, setSavingPost] = useState(false);
    const [blogForm, setBlogForm] = useState({
        title: '',
        excerpt: '',
        content: '',
        category: 'actualite',
        tags: '',
        image_url: '',
        status: 'published'
    });

    // ============================================
    // KYC
    // ============================================
    const [kycRequests, setKycRequests] = useState([]);
    const [kycLoading, setKycLoading] = useState(false);
    const [selectedKyc, setSelectedKyc] = useState(null);
    const [showKycDetailModal, setShowKycDetailModal] = useState(false);
    const [kycFilter, setKycFilter] = useState('all');
    const [processingKyc, setProcessingKyc] = useState(false);

    // ============================================
    // FORMULAIRES
    // ============================================
    const [creatingUser, setCreatingUser] = useState(false);
    const [creatingAgent, setCreatingAgent] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [createdAgent, setCreatedAgent] = useState(null);
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [userForm, setUserForm] = useState({
        phone: '',
        fullname: '',
        password: '',
        confirmPassword: '',
        email: '',
        province: '',
        city: '',
        address: '',
        role: 'user'
    });

    const [agentForm, setAgentForm] = useState({
        phone: '',
        fullname: '',
        password: '',
        confirmPassword: '',
        province: '',
        agency_name: '',
        agency_address: '',
        agency_phone: '',
        agency_type: 'secondaire'
    });

    const [editUserForm, setEditUserForm] = useState({
        id: '',
        phone: '',
        fullname: '',
        email: '',
        province: '',
        city: '',
        address: '',
        role: '',
        is_active: true
    });

    const [editAgentForm, setEditAgentForm] = useState({
        id: '',
        phone: '',
        fullname: '',
        province: '',
        agency_name: '',
        agency_address: '',
        agency_phone: '',
        agency_type: '',
        is_active: true
    });

    const [provinces, setProvinces] = useState([]);

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
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (user?.role === 'admin' && mounted) {
            fetchAdminData();
            fetchProvinces();
            fetchKycRequests();
            fetchServiceCompanies();
            fetchTravelAgencies();
        }
    }, [user, mounted]);

    useEffect(() => {
        if (!mounted) return;
        if (activeTab === 'blog') fetchBlogPosts();
        if (activeTab === 'kyc') fetchKycRequests();
        if (activeTab === 'service-companies') fetchServiceCompanies();
        if (activeTab === 'travel-agencies') fetchTravelAgencies();
    }, [activeTab, mounted]);

    // ============================================
    // FETCH - ADMIN DATA
    // ============================================
    const fetchAdminData = async () => {
        try {
            const [usersRes, agentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/users`, getAuthHeaders()).catch(() => ({ data: { users: [] } })),
                axios.get(`${API_URL}/api/admin/users?role=agent`, getAuthHeaders()).catch(() => ({ data: { users: [] } }))
            ]);

            const usersData = usersRes.data?.users || [];
            const agentsData = agentsRes.data?.users || [];

            setUsers(usersData);
            setAgents(agentsData);

            const totalBalance = usersData.reduce((sum, u) => sum + (u.balance || 0), 0);
            setStats({
                totalUsers: usersData.length,
                totalAgents: agentsData.length,
                totalBalance,
                totalTransactions: 0
            });
        } catch (error) {
            console.error('❌ Erreur fetchAdminData:', error);
            toast.error('Erreur chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/provinces`).catch(() => ({ data: [] }));
            setProvinces(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('❌ Erreur provinces:', error);
        }
    };

    // ============================================
    // FETCH - ENTREPRISES DE SERVICES
    // ============================================
    const fetchServiceCompanies = async () => {
        setCompaniesLoading(true);
        try {
            const token = getToken();
            if (!token) {
                toast.error('Session expirée');
                navigate('/login');
                return;
            }

            const response = await axios.get(`${API_URL}/api/service-companies`, getAuthHeaders())
                .catch(() => ({ data: [] }));

            const data = Array.isArray(response.data) ? response.data : [];
            setServiceCompanies(data);
            setCompanies(data);

            // ✅ Calculer les stats
            setCompanyStats({
                total: data.length,
                active: data.filter(c => c.is_active === 1 || c.is_active === true).length,
                inactive: data.filter(c => !c.is_active).length,
                water: data.filter(c => c.type === 'water').length,
                electricity: data.filter(c => c.type === 'electricity').length,
                totalRevenue: data.reduce((sum, c) => sum + (c.total_revenue || 0), 0),
                totalPayments: data.reduce((sum, c) => sum + (c.total_payments || 0), 0)
            });

            console.log('✅ Entreprises chargées:', data.length);
        } catch (error) {
            console.error('❌ Erreur entreprises:', error);
            setServiceCompanies([]);
            setCompanies([]);
        } finally {
            setCompaniesLoading(false);
        }
    };

    // ============================================
    // FETCH - AGENCES DE VOYAGE
    // ============================================
    const fetchTravelAgencies = async () => {
        setTravelAgenciesLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/admin/travel-agencies`, getAuthHeaders())
                .catch(() => ({ data: [] }));
            setTravelAgencies(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('❌ Erreur agences:', error);
            setTravelAgencies([]);
        } finally {
            setTravelAgenciesLoading(false);
        }
    };

    // ============================================
    // FETCH - KYC
    // ============================================
    const fetchKycRequests = async () => {
        setKycLoading(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/admin/kyc/requests?status=${kycFilter}`,
                getAuthHeaders()
            ).catch(() => ({ data: { requests: [] } }));
            setKycRequests(response.data?.requests || []);
        } catch (error) {
            console.error('❌ Erreur KYC:', error);
            setKycRequests([]);
        } finally {
            setKycLoading(false);
        }
    };

    // ============================================
    // FETCH - BLOG
    // ============================================
    const fetchBlogPosts = async () => {
        setBlogLoading(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/blog/posts?status=all`,
                getAuthHeaders()
            ).catch(() => ({ data: { posts: [] } }));
            setBlogPosts(Array.isArray(response.data?.posts) ? response.data.posts : []);
        } catch (error) {
            console.error('❌ Erreur blog:', error);
            setBlogPosts([]);
        } finally {
            setBlogLoading(false);
        }
    };

    // ============================================
    // GESTION UTILISATEURS
    // ============================================
    const handleUserFormChange = (e) => {
        setUserForm({ ...userForm, [e.target.name]: e.target.value });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (userForm.password !== userForm.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (!/^\d{8}$/.test(userForm.phone)) {
            toast.error('Le téléphone doit contenir 8 chiffres');
            return;
        }

        setCreatingUser(true);
        try {
            const response = await axios.post(`${API_URL}/api/admin/users`, {
                phone: userForm.phone,
                fullname: userForm.fullname,
                password: userForm.password,
                email: userForm.email,
                province: userForm.province,
                city: userForm.city,
                address: userForm.address,
                role: userForm.role
            }, getAuthHeaders());

            setCreatedUser(response.data.user);
            toast.success('✅ Utilisateur créé');
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur lors de la création');
        } finally {
            setCreatingUser(false);
        }
    };

    const openEditUserModal = (u) => {
        setEditUserForm({
            id: u.id,
            phone: u.phone,
            fullname: u.fullname,
            email: u.email || '',
            province: u.province || '',
            city: u.city || '',
            address: u.address || '',
            role: u.role,
            is_active: u.is_active === 1
        });
        setShowEditUserModal(true);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/api/admin/users/${editUserForm.id}`, {
                fullname: editUserForm.fullname,
                email: editUserForm.email,
                province: editUserForm.province,
                city: editUserForm.city,
                address: editUserForm.address,
                role: editUserForm.role
            }, getAuthHeaders());

            toast.success('✅ Utilisateur modifié');
            setShowEditUserModal(false);
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur modification');
        }
    };

    const toggleUserStatus = async (userId, currentStatus, userName) => {
        const action = currentStatus ? 'bloquer' : 'débloquer';
        if (!window.confirm(`${action} "${userName}" ?`)) return;

        try {
            await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-status`, {
                is_active: !currentStatus
            }, getAuthHeaders());

            toast.success(`✅ Utilisateur ${action === 'bloquer' ? 'bloqué' : 'débloqué'}`);
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const deleteUser = async (userId, userName) => {
        if (!window.confirm(`Supprimer "${userName}" ?`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/users/${userId}`, getAuthHeaders());
            toast.success('✅ Utilisateur supprimé');
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur suppression');
        }
    };

    // ============================================
    // RÉINITIALISATION MOT DE PASSE
    // ============================================
    const openResetPasswordModal = (u) => {
        setSelectedUser(u);
        setPasswordResetResult(null);
        setShowResetPasswordModal(true);
    };

    const confirmResetPassword = async () => {
        if (!selectedUser) return;
        setResettingPassword(true);

        try {
            const response = await axios.post(
                `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`,
                {},
                getAuthHeaders()
            );

            if (response.data.success) {
                setPasswordResetResult({
                    new_password: response.data.new_password,
                    user_name: selectedUser.fullname,
                    user_phone: selectedUser.phone
                });
                toast.success('🔐 Mot de passe réinitialisé');
                fetchAdminData();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
            setShowResetPasswordModal(false);
        } finally {
            setResettingPassword(false);
        }
    };

    const closePasswordResetModal = () => {
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        setPasswordResetResult(null);
    };

    // ============================================
    // RÉINITIALISATION CLÉ PRIVÉE
    // ============================================
    const handleResetPrivateKey = (userId, userType, userName, userPhone) => {
        setSelectedUserForReset({ id: userId, type: userType, name: userName, phone: userPhone });
        setResetResult(null);
        setShowResetKeyModal(true);
    };

    const confirmResetKey = async () => {
        if (!selectedUserForReset) return;
        setResettingKey(true);

        try {
            const response = await axios.post(
                `${API_URL}/api/admin/users/${selectedUserForReset.id}/reset-key`,
                {},
                getAuthHeaders()
            );

            if (response.data.success) {
                setResetResult({
                    new_private_key: response.data.new_private_key,
                    user_name: selectedUserForReset.name,
                    user_phone: selectedUserForReset.phone
                });
                toast.success('🔑 Clé privée réinitialisée');
                fetchAdminData();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
            setShowResetKeyModal(false);
        } finally {
            setResettingKey(false);
        }
    };

    const closeResetModal = () => {
        setShowResetKeyModal(false);
        setSelectedUserForReset(null);
        setResetResult(null);
    };

    // ============================================
    // GESTION AGENTS
    // ============================================
    const handleAgentFormChange = (e) => {
        setAgentForm({ ...agentForm, [e.target.name]: e.target.value });
    };

    const handleCreateAgent = async (e) => {
        e.preventDefault();

        if (agentForm.password !== agentForm.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (!/^\d{8}$/.test(agentForm.phone)) {
            toast.error('Le téléphone doit contenir 8 chiffres');
            return;
        }

        setCreatingAgent(true);
        try {
            const response = await axios.post(`${API_URL}/api/admin/agents`, {
                phone: agentForm.phone,
                fullname: agentForm.fullname,
                password: agentForm.password,
                province: agentForm.province,
                agency_name: agentForm.agency_name,
                agency_address: agentForm.agency_address,
                agency_phone: agentForm.agency_phone || agentForm.phone,
                agency_type: agentForm.agency_type
            }, getAuthHeaders());

            setCreatedAgent(response.data.agent);
            toast.success('✅ Agent créé');
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur création');
        } finally {
            setCreatingAgent(false);
        }
    };

    const openEditAgentModal = (a) => {
        setEditAgentForm({
            id: a.id,
            phone: a.phone,
            fullname: a.fullname,
            province: a.province || '',
            agency_name: a.agency_name || '',
            agency_address: a.agency_address || '',
            agency_phone: a.agency_phone || '',
            agency_type: a.agency_type || 'secondaire',
            is_active: a.is_active === 1
        });
        setShowEditAgentModal(true);
    };

    const handleEditAgent = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/api/admin/agents/${editAgentForm.id}`, {
                fullname: editAgentForm.fullname,
                province: editAgentForm.province,
                agency_name: editAgentForm.agency_name,
                agency_address: editAgentForm.agency_address,
                agency_phone: editAgentForm.agency_phone,
                agency_type: editAgentForm.agency_type
            }, getAuthHeaders());

            toast.success('✅ Agent modifié');
            setShowEditAgentModal(false);
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur modification');
        }
    };

    const toggleAgentStatus = async (agentId, currentStatus, agentName) => {
        const action = currentStatus ? 'bloquer' : 'débloquer';
        if (!window.confirm(`${action} "${agentName}" ?`)) return;

        try {
            await axios.put(`${API_URL}/api/admin/agents/${agentId}/toggle-status`, {
                is_active: !currentStatus
            }, getAuthHeaders());
            toast.success(`✅ Agent ${action === 'bloquer' ? 'bloqué' : 'débloqué'}`);
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const deleteAgent = async (agentId, agentName) => {
        if (!window.confirm(`Supprimer "${agentName}" ?`)) return;
        try {
            await axios.delete(`${API_URL}/api/admin/agents/${agentId}`, getAuthHeaders());
            toast.success('✅ Agent supprimé');
            fetchAdminData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur suppression');
        }
    };

    // ============================================
    // GESTION ENTREPRISES DE SERVICES
    // ============================================
    const handleCompanyFormChange = (e) => {
        setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();

        if (!companyForm.agentPhone || !/^\d{8}$/.test(companyForm.agentPhone)) {
            toast.error('Numéro agent invalide (8 chiffres)');
            return;
        }

        if (!companyForm.password || companyForm.password.length < 4) {
            toast.error('Mot de passe requis (min 4 caractères)');
            return;
        }

        if (companyForm.password !== companyForm.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (!companyForm.name) {
            toast.error('Nom requis');
            return;
        }

        setCreatingCompany(true);
        try {
            const response = await axios.post(`${API_URL}/api/admin/service-companies`, {
                name: companyForm.name,
                type: companyForm.type,
                fullName: companyForm.fullName || '',
                description: companyForm.description || '',
                logo: companyForm.logo || '',
                contactPhone: companyForm.contactPhone || '',
                contactEmail: companyForm.contactEmail || '',
                address: companyForm.address || '',
                color: companyForm.color || '',
                password: companyForm.password,
                agentPhone: companyForm.agentPhone
            }, getAuthHeaders());

            setCreatedCompany(response.data.company);
            toast.success(`✅ ${response.data.company.name} créée`);

            setCompanyForm({
                name: '',
                type: 'water',
                fullName: '',
                description: '',
                logo: '',
                contactPhone: '',
                contactEmail: '',
                address: '',
                color: '',
                password: '',
                confirmPassword: '',
                agentPhone: ''
            });

            fetchServiceCompanies();
        } catch (error) {
            console.error('❌ Erreur création entreprise:', error);
            toast.error(error.response?.data?.error || 'Erreur création');
        } finally {
            setCreatingCompany(false);
        }
    };

    const handleEditCompany = (company) => {
        setEditingCompany(company);
        setCompanyForm({
            name: company.name || '',
            type: company.type || 'water',
            fullName: company.fullName || '',
            description: company.description || '',
            logo: company.logo || '',
            contactPhone: company.contact_phone || '',
            contactEmail: company.contact_email || '',
            address: company.address || '',
            color: company.color || '',
            password: '',
            confirmPassword: '',
            agentPhone: company.agent_phone || ''
        });
        setShowCompanyModal(true);
    };

    const handleUpdateCompany = async (e) => {
        e.preventDefault();
        setCreatingCompany(true);

        try {
            await axios.put(`${API_URL}/api/admin/service-companies/${editingCompany.id}`, {
                name: companyForm.name,
                type: companyForm.type,
                fullName: companyForm.fullName || '',
                description: companyForm.description || '',
                logo: companyForm.logo || '',
                contactPhone: companyForm.contactPhone || '',
                contactEmail: companyForm.contactEmail || '',
                address: companyForm.address || '',
                color: companyForm.color || ''
            }, getAuthHeaders());

            toast.success('✅ Entreprise modifiée');
            resetCompanyModal();
            fetchServiceCompanies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur modification');
        } finally {
            setCreatingCompany(false);
        }
    };

    const handleDeleteCompany = async (id, name) => {
        if (!window.confirm(`Supprimer "${name}" ?`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/service-companies/${id}`, getAuthHeaders());
            toast.success('✅ Entreprise supprimée');
            fetchServiceCompanies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur suppression');
        }
    };

    // ✅ FONCTION MANQUANTE
    const handleToggleCompanyStatus = async (id, name, activate) => {
        const action = activate ? 'activer' : 'désactiver';
        if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${name}" ?`)) return;

        try {
            await axios.put(`${API_URL}/api/admin/service-companies/${id}/toggle-status`, {
                is_active: activate ? 1 : 0
            }, getAuthHeaders());
            toast.success(`✅ Fournisseur ${activate ? 'activé' : 'désactivé'}`);
            fetchServiceCompanies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur statut');
        }
    };

    const resetCompanyModal = () => {
        setShowCompanyModal(false);
        setEditingCompany(null);
        setCreatedCompany(null);
        setCompanyForm({
            name: '',
            type: 'water',
            fullName: '',
            description: '',
            logo: '',
            contactPhone: '',
            contactEmail: '',
            address: '',
            color: '',
            password: '',
            confirmPassword: '',
            agentPhone: ''
        });
        setShowCompanyPassword(false);
        setShowCompanyConfirmPassword(false);
    };

    // ============================================
    // GESTION AGENCES DE VOYAGE
    // ============================================
    const handleTravelAgencyFormChange = (e) => {
        setTravelAgencyForm({ ...travelAgencyForm, [e.target.name]: e.target.value });
    };

    const handleCreateTravelAgency = async (e) => {
        e.preventDefault();

        if (!travelAgencyForm.name || !travelAgencyForm.phone) {
            toast.error('Nom et téléphone requis');
            return;
        }

        if (!travelAgencyForm.password || travelAgencyForm.password.length < 4) {
            toast.error('Mot de passe requis (min 4 caractères)');
            return;
        }

        if (travelAgencyForm.password !== travelAgencyForm.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        setCreatingTravelAgency(true);
        try {
            const response = await axios.post(`${API_URL}/api/admin/travel-agencies`, {
                name: travelAgencyForm.name,
                type: travelAgencyForm.type,
                description: travelAgencyForm.description,
                logo: travelAgencyForm.logo,
                phone: travelAgencyForm.phone,
                email: travelAgencyForm.email,
                address: travelAgencyForm.address,
                password: travelAgencyForm.password
            }, getAuthHeaders());

            setCreatedTravelAgency(response.data.agency);
            toast.success('✅ Agence créée');
            fetchTravelAgencies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur création');
        } finally {
            setCreatingTravelAgency(false);
        }
    };

    const handleEditTravelAgency = (agency) => {
        setEditingTravelAgency(agency);
        setTravelAgencyForm({
            name: agency.name,
            type: agency.type || 'travel_agency',
            description: agency.description || '',
            logo: agency.logo || '',
            phone: agency.phone || '',
            email: agency.email || '',
            address: agency.address || '',
            password: '',
            confirmPassword: ''
        });
        setShowTravelAgencyModal(true);
    };

    const handleUpdateTravelAgency = async (e) => {
        e.preventDefault();
        setCreatingTravelAgency(true);

        try {
            await axios.put(`${API_URL}/api/admin/travel-agencies/${editingTravelAgency.id}`, {
                name: travelAgencyForm.name,
                type: travelAgencyForm.type,
                description: travelAgencyForm.description,
                logo: travelAgencyForm.logo,
                phone: travelAgencyForm.phone,
                email: travelAgencyForm.email,
                address: travelAgencyForm.address
            }, getAuthHeaders());

            toast.success('✅ Agence modifiée');
            resetTravelAgencyModal();
            fetchTravelAgencies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur modification');
        } finally {
            setCreatingTravelAgency(false);
        }
    };

    const handleDeleteTravelAgency = async (id, name) => {
        if (!window.confirm(`Supprimer "${name}" ?`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/travel-agencies/${id}`, getAuthHeaders());
            toast.success('✅ Agence supprimée');
            fetchTravelAgencies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur suppression');
        }
    };

    const resetTravelAgencyModal = () => {
        setShowTravelAgencyModal(false);
        setEditingTravelAgency(null);
        setCreatedTravelAgency(null);
        setTravelAgencyForm({
            name: '',
            type: 'travel_agency',
            description: '',
            logo: '',
            phone: '',
            email: '',
            address: '',
            password: '',
            confirmPassword: ''
        });
        setShowTravelAgencyPassword(false);
        setShowTravelAgencyConfirmPassword(false);
    };

    // ============================================
    // GESTION KYC
    // ============================================
    const handleViewKycDetail = (kyc) => {
        setSelectedKyc(kyc);
        setShowKycDetailModal(true);
    };

    const handleApproveKyc = async (kycId) => {
        if (!window.confirm('Approuver cette demande ?')) return;
        setProcessingKyc(true);

        try {
            await axios.post(`${API_URL}/api/admin/kyc/verify/${kycId}`,
                { action: 'approve', level: 1 },
                getAuthHeaders()
            );
            toast.success('✅ KYC approuvé');
            fetchKycRequests();
            setShowKycDetailModal(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setProcessingKyc(false);
        }
    };

    const handleRejectKyc = async (kycId) => {
        const reason = prompt('Motif du rejet:');
        if (!reason) return;
        setProcessingKyc(true);

        try {
            await axios.post(`${API_URL}/api/admin/kyc/verify/${kycId}`,
                { action: 'reject', rejection_reason: reason },
                getAuthHeaders()
            );
            toast.success('✅ KYC rejeté');
            fetchKycRequests();
            setShowKycDetailModal(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setProcessingKyc(false);
        }
    };

    // ============================================
    // GESTION BLOG
    // ============================================
    const handleEditBlogPost = (post) => {
        setEditingPost(post);
        setBlogForm({
            title: post.title,
            excerpt: post.excerpt || '',
            content: post.content,
            category: post.category,
            tags: post.tags || '',
            image_url: post.image_url || '',
            status: post.status
        });
        setShowBlogForm(true);
    };

    const handleDeleteBlogPost = async (id, title) => {
        if (!window.confirm(`Supprimer "${title}" ?`)) return;

        try {
            await axios.delete(`${API_URL}/api/blog/posts/${id}`, getAuthHeaders());
            toast.success('✅ Article supprimé');
            fetchBlogPosts();
        } catch (error) {
            toast.error('Erreur suppression');
        }
    };

    const handleSaveBlogPost = async (e) => {
        e.preventDefault();
        setSavingPost(true);

        try {
            if (editingPost) {
                await axios.put(`${API_URL}/api/blog/posts/${editingPost.id}`, blogForm, getAuthHeaders());
                toast.success('✅ Article modifié');
            } else {
                await axios.post(`${API_URL}/api/blog/posts`, blogForm, getAuthHeaders());
                toast.success('✅ Article créé');
            }
            setShowBlogForm(false);
            setEditingPost(null);
            setBlogForm({ title: '', excerpt: '', content: '', category: 'actualite', tags: '', image_url: '', status: 'published' });
            fetchBlogPosts();
        } catch (error) {
            toast.error('Erreur sauvegarde');
        } finally {
            setSavingPost(false);
        }
    };

    // ============================================
    // UTILITAIRES
    // ============================================
    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copié !`);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified': return { color: 'bg-green-500/20 text-green-400', text: 'Vérifié', icon: FaCheckCircle };
            case 'pending': return { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente', icon: FaClock };
            case 'rejected': return { color: 'bg-red-500/20 text-red-400', text: 'Rejeté', icon: FaTimes };
            default: return { color: 'bg-gray-500/20 text-gray-400', text: 'Non soumis', icon: FaIdCard };
        }
    };

    const getFilteredUsers = () => {
        let filtered = [...users];
        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.phone?.includes(searchTerm)
            );
        }
        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(u => statusFilter === 'active' ? u.is_active : !u.is_active);
        }
        return filtered;
    };

    const resetUserModal = () => {
        setShowUserModal(false);
        setCreatedUser(null);
        setUserForm({
            phone: '', fullname: '', password: '', confirmPassword: '', email: '',
            province: '', city: '', address: '', role: 'user'
        });
        setShowUserPassword(false);
    };

    const resetAgentModal = () => {
        setShowAgentModal(false);
        setCreatedAgent(null);
        setAgentForm({
            phone: '', fullname: '', password: '', confirmPassword: '', province: '',
            agency_name: '', agency_address: '', agency_phone: '', agency_type: 'secondaire'
        });
        setShowPassword(false);
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
        { id: 'users', label: 'Utilisateurs', icon: FaUsers },
        { id: 'agents', label: 'Agents', icon: FaUserTie },
        { id: 'service-companies', label: 'Fournisseurs Eau/Élec', icon: FaBuilding },
        { id: 'travel-agencies', label: 'Agences de Voyage', icon: FaPlane },
        { id: 'wallet', label: 'Wallet Principal', icon: FaMoneyBillWave },
        { id: 'announce', label: 'Annonces', icon: FaBell },
        { id: 'blog', label: 'Blog', icon: FaNewspaper },
        { id: 'kyc', label: 'KYC', icon: FaIdCard },
        { id: 'taxes', label: 'Gestion des Taxes', icon: FaLandmark },
        { id: 'agent-applications', label: 'Candidatures Agents', icon: FaUserCheck },
        { id: 'pin-management', label: 'Gestion PIN', icon: FaKey },
        { id: 'settings', label: 'Paramètres', icon: FaCog }
    ];

    if (user?.role !== 'admin') {
        return (
            <Layout user={user}>
                <div className="card text-center">
                    <p className="text-red-400">Accès non autorisé.</p>
                </div>
            </Layout>
        );
    }

    if (!mounted) return null;

    const filteredUsers = getFilteredUsers();

    return (
        <Layout user={user} socket={socket}>
            <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6">Administration AlkherPay</h2>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setShowBlogForm(false);
                                setEditingPost(null);
                                setShowKycDetailModal(false);
                                setShowTravelAgencyDetailModal(false);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-yellow-500 text-black'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Dashboard */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4">
                            <p className="text-white/70 text-sm">Utilisateurs</p>
                            <p className="text-white text-3xl font-bold">{stats.totalUsers || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4">
                            <p className="text-white/70 text-sm">Agents</p>
                            <p className="text-white text-3xl font-bold">{stats.totalAgents || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-4">
                            <p className="text-white/70 text-sm">Volume total</p>
                            <p className="text-white text-2xl font-bold">{stats.totalBalance?.toLocaleString()} FCFA</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4">
                            <p className="text-white/70 text-sm">Transactions</p>
                            <p className="text-white text-3xl font-bold">{stats.totalTransactions || 0}</p>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div>
                        <button onClick={() => setShowUserModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
                            <FaUserPlus /> Nouvel utilisateur
                        </button>

                        <div className="bg-white/5 rounded-xl p-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                                </div>
                                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-gray-700 text-white">
                                    <option value="all">Tous les rôles</option>
                                    <option value="user">Utilisateurs</option>
                                    <option value="agent">Agents</option>
                                    <option value="commune">Commune</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-gray-700 text-white">
                                    <option value="all">Tous les statuts</option>
                                    <option value="active">Actifs</option>
                                    <option value="inactive">Inactifs</option>
                                </select>
                                <div className="text-right text-white/50 text-sm">{filteredUsers.length} utilisateur(s)</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-white/20">
                                    <tr className="text-left text-white/60">
                                        <th className="pb-3">Nom</th>
                                        <th className="pb-3">Téléphone</th>
                                        <th className="pb-3">Rôle</th>
                                        <th className="pb-3">Province</th>
                                        <th className="pb-3">Solde</th>
                                        <th className="pb-3">Statut</th>
                                        <th className="pb-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="border-b border-white/10">
                                            <td className="py-3 text-white">{u.fullname}</td>
                                            <td className="py-3 text-white/80">{u.phone}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-3 text-white/80">{u.province}</td>
                                            <td className="py-3 text-white">{(u.balance || 0).toLocaleString()} FCFA</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {u.is_active ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    <button onClick={() => openEditUserModal(u)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" title="Modifier"><FaEdit size={14} /></button>
                                                    <button onClick={() => openResetPasswordModal(u)} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Reset mot de passe"><FaUndo size={14} /></button>
                                                    <button onClick={() => handleResetPrivateKey(u.id, u.role, u.fullname, u.phone)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" title="Reset clé"><FaSync size={14} /></button>
                                                    <button onClick={() => toggleUserStatus(u.id, u.is_active, u.fullname)} className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" title="Bloquer/Débloquer">{u.is_active ? <FaBan size={14} /> : <FaUnlockAlt size={14} />}</button>
                                                    <button onClick={() => deleteUser(u.id, u.fullname)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Supprimer"><FaTrashAlt size={14} /></button>
                                                </div>
                                            </td>Agent
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Agents Tab */}
                {activeTab === 'agents' && (
                    <div>
                        <button onClick={() => setShowAgentModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
                            <FaUserPlus /> Nouvel agent
                        </button>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-white/20">
                                    <tr className="text-left text-white/60">
                                        <th className="pb-3">Nom</th>
                                        <th className="pb-3">Téléphone</th>
                                        <th className="pb-3">Agence</th>
                                        <th className="pb-3">Province</th>
                                        <th className="pb-3">Solde</th>
                                        <th className="pb-3">Statut</th>
                                        <th className="pb-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map(a => (
                                        <tr key={a.id} className="border-b border-white/10">
                                            <td className="py-3 text-white">{a.fullname}</td>
                                            <td className="py-3 text-white/80">{a.phone}</td>
                                            <td className="py-3 text-white/80">{a.agency_name || '-'}</td>
                                            <td className="py-3 text-white/80">{a.province}</td>
                                            <td className="py-3 text-white">{(a.balance || 0).toLocaleString()} FCFA</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {a.is_active ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    <button onClick={() => openEditAgentModal(a)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><FaEdit size={14} /></button>
                                                    <button onClick={() => openResetPasswordModal({ ...a, role: 'agent' })} className="p-1.5 rounded-lg bg-green-500/20 text-green-400"><FaUndo size={14} /></button>
                                                    <button onClick={() => handleResetPrivateKey(a.id, a.role, a.fullname, a.phone)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400"><FaSync size={14} /></button>
                                                    <button onClick={() => toggleAgentStatus(a.id, a.is_active, a.fullname)} className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400">{a.is_active ? <FaBan size={14} /> : <FaUnlockAlt size={14} />}</button>
                                                    <button onClick={() => deleteAgent(a.id, a.fullname)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><FaTrashAlt size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Service Companies Tab */}
                {activeTab === 'service-companies' && (
                    <div>
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                            <h3 className="text-white text-lg font-semibold">Fournisseurs Eau/Électricité</h3>
                            <button onClick={() => { setEditingCompany(null); setShowCompanyModal(true); }} className="bg-yellow-500 text-black px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
                                <FaPlus /> Nouveau fournisseur
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-yellow-400">{companyStats.total}</p>
                                <p className="text-xs text-white/50">Total</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-green-400">{companyStats.active}</p>
                                <p className="text-xs text-white/50">Actifs</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-400">{companyStats.water}</p>
                                <p className="text-xs text-white/50">💧 Eau</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-yellow-400">{companyStats.electricity}</p>
                                <p className="text-xs text-white/50">⚡ Électricité</p>
                            </div>
                        </div>

                        {/* Liste */}
                        {companiesLoading ? (
                            <div className="text-center py-8 text-white/60 flex items-center justify-center gap-3">
                                <FaSpinner className="animate-spin" /> Chargement...
                            </div>
                        ) : serviceCompanies.length === 0 ? (
                            <div className="col-span-2 text-center py-12 bg-white/5 rounded-xl">
                                <FaBuilding className="text-white/20 text-5xl mx-auto mb-3" />
                                <p className="text-white/50">Aucun fournisseur</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {serviceCompanies.map(company => (
                                    <div key={company.id} className={`bg-white/5 rounded-xl p-4 hover:bg-white/10 transition border ${company.is_active === 1 ? 'border-green-500/20' : 'border-red-500/20'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="text-4xl">{company.logo || (company.type === 'water' ? '💧' : '⚡')}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-white font-semibold text-lg truncate">{company.name}</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${company.is_active === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {company.is_active === 1 ? 'Actif' : 'Inactif'}
                                                        </span>
                                                    </div>
                                                    <p className="text-white/50 text-sm">{company.type === 'water' ? 'Eau' : 'Électricité'}</p>
                                                    {company.agent_phone && (
                                                        <p className="text-green-400/60 text-xs mt-1 flex items-center gap-1">
                                                            <FaUserTie size={10} /> Agent: {company.agent_phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 ml-2">
                                                <button onClick={() => handleEditCompany(company)} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" title="Modifier"><FaEdit size={14} /></button>
                                                <button onClick={() => handleToggleCompanyStatus(company.id, company.name, company.is_active !== 1)} className={`p-2 rounded-lg ${company.is_active === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`} title={company.is_active === 1 ? 'Désactiver' : 'Activer'}>
                                                    {company.is_active === 1 ? <FaBan size={14} /> : <FaCheckCircle size={14} />}
                                                </button>
                                                <button onClick={() => handleDeleteCompany(company.id, company.name)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Supprimer"><FaTrashAlt size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Travel Agencies Tab */}
                {activeTab === 'travel-agencies' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white text-lg font-semibold">Agences de Voyage</h3>
                            <button onClick={() => setShowTravelAgencyModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
                                <FaPlus /> Nouvelle agence
                            </button>
                        </div>

                        {travelAgenciesLoading ? (
                            <div className="text-center py-8 text-white/60 flex items-center justify-center gap-3">
                                <FaSpinner className="animate-spin" /> Chargement...
                            </div>
                        ) : travelAgencies.length === 0 ? (
                            <div className="text-center py-8 bg-white/5 rounded-xl">
                                <FaPlane className="text-white/20 text-5xl mx-auto mb-3" />
                                <p className="text-white/50">Aucune agence</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {travelAgencies.map(agency => (
                                    <div key={agency.id} className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-4 border border-purple-500/30">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="text-4xl">{agency.logo || '✈️'}</div>
                                                <div>
                                                    <h3 className="text-white font-semibold text-lg">{agency.name}</h3>
                                                    <p className="text-white/50 text-sm">{agency.type === 'travel_agency' ? 'Agence de voyage' : 'Tour opérateur'}</p>
                                                    {agency.wallet_balance !== undefined && (
                                                        <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                                                            <FaWallet size={10} /> {(agency.wallet_balance || 0).toLocaleString()} FCFA
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setSelectedTravelAgencyDetail(agency); setShowTravelAgencyDetailModal(true); }} className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><FaEye size={14} /></button>
                                                <button onClick={() => handleEditTravelAgency(agency)} className="p-2 rounded-lg bg-green-500/20 text-green-400"><FaEdit size={14} /></button>
                                                <button onClick={() => handleDeleteTravelAgency(agency.id, agency.name)} className="p-2 rounded-lg bg-red-500/20 text-red-400"><FaTrashAlt size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* KYC Tab */}
                {activeTab === 'kyc' && (
                    <div>
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {['all', 'pending', 'verified', 'rejected'].map(f => (
                                <button key={f} onClick={() => { setKycFilter(f); fetchKycRequests(); }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === f ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60'}`}>
                                    {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : f === 'verified' ? 'Vérifiés' : 'Rejetés'}
                                </button>
                            ))}
                        </div>

                        {kycLoading ? (
                            <div className="flex justify-center py-12"><FaSpinner className="animate-spin text-3xl text-white" /></div>
                        ) : kycRequests.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaIdCard className="text-white/20 text-5xl mx-auto mb-3" />
                                <p className="text-white/50">Aucune demande KYC</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-white/20">
                                        <tr className="text-left text-white/60">
                                            <th className="pb-3">Nom</th>
                                            <th className="pb-3">Contact</th>
                                            <th className="pb-3">Type</th>
                                            <th className="pb-3">Date</th>
                                            <th className="pb-3">Statut</th>
                                            <th className="pb-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {kycRequests.map(req => {
                                            const status = getStatusBadge(req.status);
                                            const StatusIcon = status.icon;
                                            return (
                                                <tr key={req.id} className="border-b border-white/10">
                                                    <td className="py-3">
                                                        <p className="text-white font-medium">{req.fullname}</p>
                                                        <p className="text-xs text-white/40">{req.id_type?.toUpperCase()}</p>
                                                    </td>
                                                    <td className="py-3 text-white/80">{req.user_phone}</td>
                                                    <td className="py-3 text-white/80">{req.id_type?.toUpperCase() || '-'}</td>
                                                    <td className="py-3 text-white/60 text-sm">{req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('fr-FR') : '-'}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}>
                                                            <StatusIcon size={10} /> {status.text}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={() => handleViewKycDetail(req)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400" title="Voir"><FaEye size={14} /></button>
                                                            {req.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleApproveKyc(req.id)} disabled={processingKyc} className="p-1.5 rounded-lg bg-green-500/20 text-green-400" title="Approuver"><FaCheckCircle size={14} /></button>
                                                                    <button onClick={() => handleRejectKyc(req.id)} disabled={processingKyc} className="p-1.5 rounded-lg bg-red-500/20 text-red-400" title="Rejeter"><FaTimesCircle size={14} /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Wallet Tab */}
                {activeTab === 'wallet' && (
                    <div className="text-center">
                        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl p-8 mb-6">
                            <p className="text-white/80 text-sm">Wallet Principal</p>
                            <h2 className="text-5xl font-bold text-white my-4">
                                {stats.totalBalance ? Math.floor(stats.totalBalance * 0.015).toLocaleString() : '0'} FCFA
                            </h2>
                            <p className="text-white/60 text-sm">Frais accumulés (1.5%)</p>
                        </div>
                    </div>
                )}

                {/* Announce Tab */}
                {activeTab === 'announce' && (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        try {
                            await axios.post(`${API_URL}/api/admin/announce`, {
                                title: formData.get('title'),
                                content: formData.get('content'),
                                facebook_link: formData.get('facebook'),
                                whatsapp_link: formData.get('whatsapp'),
                                telegram_link: formData.get('telegram'),
                                website_link: formData.get('website')
                            }, getAuthHeaders());
                            toast.success('✅ Annonce publiée');
                            e.target.reset();
                        } catch (error) {
                            toast.error('Erreur publication');
                        }
                    }} className="space-y-4">
                        <input name="title" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Titre" required />
                        <textarea name="content" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="4" placeholder="Contenu" required />
                        <input name="facebook" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Facebook" />
                        <input name="whatsapp" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien WhatsApp" />
                        <input name="telegram" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Telegram" />
                        <input name="website" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Site" />
                        <button type="submit" className="w-full bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400">Publier</button>
                    </form>
                )}

                {/* Blog Tab */}
                {activeTab === 'blog' && (
                    <div>
                        <button onClick={() => { setEditingPost(null); setShowBlogForm(true); }} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2">
                            <FaPlus /> Nouvel article
                        </button>

                        {blogLoading ? (
                            <div className="text-center py-12 text-white/60">Chargement...</div>
                        ) : blogPosts.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaNewspaper className="text-white/20 text-5xl mx-auto mb-3" />
                                <p className="text-white/50">Aucun article</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {blogPosts.map(post => (
                                    <div key={post.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-medium">{post.title}</p>
                                            <p className="text-white/40 text-sm">{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditBlogPost(post)} className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"><FaEdit /></button>
                                            <button onClick={() => handleDeleteBlogPost(post.id, post.title)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"><FaTrashAlt /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Taxes Tab */}
                {activeTab === 'taxes' && <AdminTaxes user={user} />}

                {/* Agent Applications Tab */}
                {activeTab === 'agent-applications' && <AgentApplicationsManager />}

                {/* PIN Management Tab */}
                {activeTab === 'pin-management' && <AdminPinManagement />}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="text-center py-12">
                        <FaCog className="text-white/20 text-5xl mx-auto mb-3" />
                        <p className="text-white/50">Paramètres en développement</p>
                    </div>
                )}
            </div>

            {/* ============================================
                MODAL CRÉATION UTILISATEUR
            ============================================ */}
            <Modal isOpen={showUserModal} onClose={resetUserModal} title="Créer un utilisateur" maxWidth="2xl">
                {createdUser ? (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4">Utilisateur créé !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                            <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdUser.fullname}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdUser.phone}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{userForm.password}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdUser.private_key}</span></div>
                        </div>
                        <button onClick={resetUserModal} className="w-full bg-yellow-500 text-black py-2 rounded-lg">Fermer</button>
                    </div>
                ) : (
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div><label className="block text-sm text-gray-300 mb-1">Nom complet *</label><input type="text" name="fullname" value={userForm.fullname} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={userForm.phone} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" maxLength="8" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Email</label><input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Mot de passe *</label><div className="relative"><input type={showUserPassword ? 'text' : 'password'} name="password" value={userForm.password} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required /><button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showUserPassword ? <FaEyeSlash /> : <FaEye />}</button></div></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Confirmer *</label><input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Province *</label><select name="province" value={userForm.province} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required><option value="">Sélectionnez</option>{provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Rôle</label><select name="role" value={userForm.role} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="user">Utilisateur</option><option value="agent">Agent</option><option value="admin">Admin</option></select></div>
                        <button type="submit" disabled={creatingUser} className="w-full bg-yellow-500 text-black py-2 rounded-lg disabled:opacity-50">
                            {creatingUser ? 'Création...' : 'Créer'}
                        </button>
                    </form>
                )}
            </Modal>

            {/* ============================================
                MODAL CRÉATION AGENT
            ============================================ */}
            <Modal isOpen={showAgentModal} onClose={resetAgentModal} title="Créer un agent" maxWidth="2xl">
                {createdAgent ? (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4">Agent créé !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                            <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdAgent.fullname}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdAgent.phone}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{agentForm.password}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdAgent.private_key}</span></div>
                        </div>
                        <button onClick={resetAgentModal} className="w-full bg-yellow-500 text-black py-2 rounded-lg">Fermer</button>
                    </div>
                ) : (
                    <form onSubmit={handleCreateAgent} className="space-y-4">
                        <div><label className="block text-sm text-gray-300 mb-1">Nom complet *</label><input type="text" name="fullname" value={agentForm.fullname} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Téléphone *</label><input type="tel" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" maxLength="8" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Mot de passe *</label><div className="relative"><input type={showPassword ? 'text' : 'password'} name="password" value={agentForm.password} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showPassword ? <FaEyeSlash /> : <FaEye />}</button></div></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Confirmer *</label><input type="password" name="confirmPassword" value={agentForm.confirmPassword} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Province *</label><select name="province" value={agentForm.province} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required><option value="">Sélectionnez</option>{provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Nom agence *</label><input type="text" name="agency_name" value={agentForm.agency_name} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-300 mb-1">Adresse agence *</label><textarea name="agency_address" value={agentForm.agency_address} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" required /></div>
                        <button type="submit" disabled={creatingAgent} className="w-full bg-yellow-500 text-black py-2 rounded-lg disabled:opacity-50">
                            {creatingAgent ? 'Création...' : 'Créer'}
                        </button>
                    </form>
                )}
            </Modal>

            {/* ============================================
                MODAL RÉINITIALISATION MOT DE PASSE
            ============================================ */}
            <Modal isOpen={showResetPasswordModal && !passwordResetResult} onClose={closePasswordResetModal} title="Réinitialiser le mot de passe" maxWidth="md">
                {selectedUser && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaKey className="text-yellow-400 text-3xl" />
                        </div>
                        <p className="text-gray-300 mb-4">
                            Réinitialiser le mot de passe de <strong className="text-white">{selectedUser.fullname}</strong> ?
                        </p>
                        <p className="text-yellow-400 text-sm mb-6 bg-yellow-500/10 rounded-lg p-3">
                            ⚠️ Un nouveau mot de passe à 6 chiffres sera généré.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={closePasswordResetModal} className="flex-1 bg-gray-700 text-white py-3 rounded-lg">Annuler</button>
                            <button onClick={confirmResetPassword} disabled={resettingPassword} className="flex-1 bg-green-600 text-white py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {resettingPassword ? <FaSpinner className="animate-spin" /> : <><FaUndo /> Réinitialiser</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Résultat reset password */}
            <Modal isOpen={!!passwordResetResult} onClose={closePasswordResetModal} title="Mot de passe réinitialisé" maxWidth="md">
                {passwordResetResult && (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Succès !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                            <div className="flex justify-between"><span className="text-white/60">Utilisateur</span><span className="text-white">{passwordResetResult.user_name}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Téléphone</span><span className="text-white">{passwordResetResult.user_phone}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60">Nouveau mot de passe</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-green-400 bg-black/30 px-3 py-1 rounded font-mono text-lg">{passwordResetResult.new_password}</code>
                                    <button onClick={() => copyToClipboard(passwordResetResult.new_password, 'Mot de passe')} className="text-yellow-400"><FaCopy /></button>
                                </div>
                            </div>
                        </div>
                        <button onClick={closePasswordResetModal} className="w-full bg-yellow-500 text-black py-3 rounded-lg">Fermer</button>
                    </div>
                )}
            </Modal>

            {/* ============================================
                MODAL RÉINITIALISATION CLÉ PRIVÉE
            ============================================ */}
            <Modal isOpen={showResetKeyModal && !resetResult} onClose={closeResetModal} title="Réinitialiser la clé privée" maxWidth="md">
                {selectedUserForReset && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaKey className="text-orange-400 text-3xl" />
                        </div>
                        <p className="text-gray-300 mb-4">
                            Réinitialiser la clé privée de <strong className="text-white">{selectedUserForReset.name}</strong> ?
                        </p>
                        <p className="text-red-400 text-sm mb-6 bg-red-500/10 rounded-lg p-3">
                            ⚠️ Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={closeResetModal} className="flex-1 bg-gray-700 text-white py-3 rounded-lg">Annuler</button>
                            <button onClick={confirmResetKey} disabled={resettingKey} className="flex-1 bg-orange-600 text-white py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {resettingKey ? <FaSpinner className="animate-spin" /> : <><FaSync /> Confirmer</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Résultat reset clé */}
            <Modal isOpen={!!resetResult} onClose={closeResetModal} title="Clé privée réinitialisée" maxWidth="md">
                {resetResult && (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Succès !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                            <div className="flex justify-between"><span className="text-white/60">Utilisateur</span><span className="text-white">{resetResult.user_name}</span></div>
                            <div className="flex justify-between"><span className="text-white/60">Téléphone</span><span className="text-white">{resetResult.user_phone}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60">Nouvelle clé</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-orange-400 bg-black/30 px-3 py-1 rounded font-mono text-lg">{resetResult.new_private_key}</code>
                                    <button onClick={() => copyToClipboard(resetResult.new_private_key, 'Clé')} className="text-yellow-400"><FaCopy /></button>
                                </div>
                            </div>
                        </div>
                        <button onClick={closeResetModal} className="w-full bg-yellow-500 text-black py-3 rounded-lg">Fermer</button>
                    </div>
                )}
            </Modal>

            {/* ============================================
                MODAL DÉTAIL KYC
            ============================================ */}
            <Modal isOpen={showKycDetailModal} onClose={() => setShowKycDetailModal(false)} title="Détails KYC" maxWidth="2xl">
                {selectedKyc && (
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FaUser className="text-blue-400" /> Informations personnelles</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between"><span className="text-white/60">Nom</span><span className="text-white">{selectedKyc.fullname}</span></div>
                                <div className="flex justify-between"><span className="text-white/60">Téléphone</span><span className="text-white">{selectedKyc.user_phone}</span></div>
                                <div className="flex justify-between"><span className="text-white/60">Date naissance</span><span className="text-white">{selectedKyc.birth_date || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-white/60">Lieu naissance</span><span className="text-white">{selectedKyc.birth_place || '-'}</span></div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FaIdCard className="text-yellow-400" /> Pièce d'identité</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between"><span className="text-white/60">Type</span><span className="text-white uppercase">{selectedKyc.id_type}</span></div>
                                <div className="flex justify-between"><span className="text-white/60">Numéro</span><span className="text-white font-mono">{selectedKyc.id_number}</span></div>
                            </div>
                        </div>
                        {selectedKyc.status === 'pending' && (
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => handleApproveKyc(selectedKyc.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Approuver</button>
                                <button onClick={() => handleRejectKyc(selectedKyc.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Rejeter</button>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button onClick={() => setShowKycDetailModal(false)} className="bg-gray-600 text-white px-6 py-2 rounded-lg">Fermer</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ============================================
                MODAL ENTREPRISE DE SERVICE
            ============================================ */}
            <Modal isOpen={showCompanyModal} onClose={resetCompanyModal} title={editingCompany ? "Modifier" : "Nouveau fournisseur"} maxWidth="2xl">
                {createdCompany ? (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4">Fournisseur créé !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                            <div className="flex justify-between"><span className="text-white/60">Entreprise</span><span className="text-white font-bold">{createdCompany.name}</span></div>
                            <div className="border-t border-white/10 my-2 pt-2">
                                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS CONNEXION</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Téléphone</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.phone}</code>
                                            <button onClick={() => copyToClipboard(createdCompany.agent?.phone, 'Téléphone')} className="text-yellow-400"><FaCopy size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Mot de passe</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{companyForm.password}</code>
                                            <button onClick={() => copyToClipboard(companyForm.password, 'Mot de passe')} className="text-yellow-400"><FaCopy size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Clé privée</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.private_key}</code>
                                            <button onClick={() => copyToClipboard(createdCompany.agent?.private_key, 'Clé')} className="text-yellow-400"><FaCopy size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={resetCompanyModal} className="w-full bg-yellow-500 text-black py-2 rounded-lg">Fermer</button>
                    </div>
                ) : (
                    <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-5">
                        <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-4 flex items-center gap-2"><FaBuilding className="text-yellow-500" /> Informations entreprise</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-300 mb-1">Nom *</label>
                                    <input type="text" name="name" value={companyForm.name} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Type *</label>
                                    <select name="type" value={companyForm.type} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required>
                                        <option value="water">💧 Eau</option>
                                        <option value="electricity">⚡ Électricité</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Téléphone contact</label>
                                    <input type="tel" name="contactPhone" value={companyForm.contactPhone} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                                    <textarea name="address" value={companyForm.address} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                                </div>
                            </div>
                        </div>

                        {!editingCompany && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaUser className="text-yellow-500" /> Compte agent</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-300 mb-1">Téléphone agent *</label>
                                        <input type="tel" name="agentPhone" value={companyForm.agentPhone || ''} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="8 chiffres" required maxLength="8" pattern="[0-9]{8}" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                                        <div className="relative">
                                            <input type={showCompanyPassword ? 'text' : 'password'} name="password" value={companyForm.password} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required minLength="4" />
                                            <button type="button" onClick={() => setShowCompanyPassword(!showCompanyPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showCompanyPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Confirmer *</label>
                                        <div className="relative">
                                            <input type={showCompanyConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={companyForm.confirmPassword} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required minLength="4" />
                                            <button type="button" onClick={() => setShowCompanyConfirmPassword(!showCompanyConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showCompanyConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={resetCompanyModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Annuler</button>
                            <button type="submit" disabled={creatingCompany} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg disabled:opacity-50">
                                {creatingCompany ? <FaSpinner className="animate-spin mx-auto" /> : editingCompany ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ============================================
                MODAL AGENCE DE VOYAGEModifier l'utilisateur
            ============================================ */}
            <Modal isOpen={showTravelAgencyModal} onClose={resetTravelAgencyModal} title={editingTravelAgency ? "Modifier l'agence" : "Nouvelle agence"} maxWidth="2xl">
                {createdTravelAgency ? (
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4">Agence créée !</h2>
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                            <div className="flex justify-between"><span className="text-white/60">Agence</span><span className="text-white font-bold">{createdTravelAgency.name}</span></div>
                            <div className="border-t border-white/10 my-2 pt-2">
                                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS CONNEXION</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Téléphone</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdTravelAgency.agent?.phone}</code>
                                            <button onClick={() => copyToClipboard(createdTravelAgency.agent?.phone, 'Téléphone')} className="text-yellow-400"><FaCopy size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Mot de passe</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{travelAgencyForm.password}</code>
                                            <button onClick={() => copyToClipboard(travelAgencyForm.password, 'Mot de passe')} className="text-yellow-400"><FaCopy size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={resetTravelAgencyModal} className="w-full bg-yellow-500 text-black py-2 rounded-lg">Fermer</button>
                    </div>
                ) : (
                    <form onSubmit={editingTravelAgency ? handleUpdateTravelAgency : handleCreateTravelAgency} className="space-y-5">
                        <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-4 flex items-center gap-2"><FaPlane className="text-yellow-500" /> Informations agence</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-300 mb-1">Nom *</label>
                                    <input type="text" name="name" value={travelAgencyForm.name} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Téléphone *</label>
                                    <input type="tel" name="phone" value={travelAgencyForm.phone} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Email</label>
                                    <input type="email" name="email" value={travelAgencyForm.email} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                                    <textarea name="address" value={travelAgencyForm.address} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                                </div>
                            </div>
                        </div>

                        {!editingTravelAgency && (
                            <div className="bg-white/5 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaKey className="text-yellow-500" /> Connexion</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                                        <div className="relative">
                                            <input type={showTravelAgencyPassword ? 'text' : 'password'} name="password" value={travelAgencyForm.password} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required />
                                            <button type="button" onClick={() => setShowTravelAgencyPassword(!showTravelAgencyPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showTravelAgencyPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Confirmer *</label>
                                        <div className="relative">
                                            <input type={showTravelAgencyConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={travelAgencyForm.confirmPassword} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required />
                                            <button type="button" onClick={() => setShowTravelAgencyConfirmPassword(!showTravelAgencyConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">{showTravelAgencyConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={resetTravelAgencyModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Annuler</button>
                            <button type="submit" disabled={creatingTravelAgency} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg disabled:opacity-50">
                                {creatingTravelAgency ? <FaSpinner className="animate-spin mx-auto" /> : editingTravelAgency ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ============================================
                MODAL DÉTAIL AGENCE DE VOYAGE
            ============================================ */}
            <Modal isOpen={showTravelAgencyDetailModal} onClose={() => setShowTravelAgencyDetailModal(false)} title="Détails agence" maxWidth="2xl">
                {selectedTravelAgencyDetail && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                            <div className="text-6xl">{selectedTravelAgencyDetail.logo || '✈️'}</div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedTravelAgencyDetail.name}</h2>
                                <p className="text-white/50">{selectedTravelAgencyDetail.type === 'travel_agency' ? 'Agence de voyage' : 'Tour opérateur'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4">
                                <h3 className="text-white font-semibold mb-3">📋 Informations</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-white/60">Statut</span><span className={selectedTravelAgencyDetail.is_active ? 'text-green-400' : 'text-red-400'}>{selectedTravelAgencyDetail.is_active ? 'Actif' : 'Inactif'}</span></div>
                                    {selectedTravelAgencyDetail.phone && <div className="flex justify-between"><span className="text-white/60">Téléphone</span><span className="text-white">{selectedTravelAgencyDetail.phone}</span></div>}
                                    {selectedTravelAgencyDetail.email && <div className="flex justify-between"><span className="text-white/60">Email</span><span className="text-white">{selectedTravelAgencyDetail.email}</span></div>}
                                </div>
                            </div>
                            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                                <h3 className="text-white font-semibold mb-3">👤 Agent</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center"><span className="text-white/60">Téléphone</span><code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{selectedTravelAgencyDetail.agent_phone || 'Non assigné'}</code></div>
                                    <div className="flex justify-between items-center"><span className="text-white/60">Solde wallet</span><span className="text-yellow-400 font-bold">{(selectedTravelAgencyDetail.wallet_balance || 0).toLocaleString()} FCFA</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button onClick={() => setShowTravelAgencyDetailModal(false)} className="bg-yellow-500 text-black px-6 py-2 rounded-lg">Fermer</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ============================================
                MODAL BLOG
            ============================================ */}
            <Modal isOpen={showBlogForm} onClose={() => { setShowBlogForm(false); setEditingPost(null); }} title={editingPost ? "Modifier l'article" : "Nouvel article"} maxWidth="2xl">
                <form onSubmit={handleSaveBlogPost} className="space-y-4">
                    <div><label className="block text-sm text-gray-300 mb-1">Titre *</label><input type="text" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Extrait</label><textarea value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Contenu *</label><textarea value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="6" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Catégorie</label>
                            <select value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
                                <option value="actualite">Actualité</option>
                                <option value="promotion">Promotion</option>
                                <option value="guide">Guide</option>
                                <option value="annonce">Annonce</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Statut</label>
                            <select value={blogForm.status} onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
                                <option value="draft">Brouillon</option>
                                <option value="published">Publié</option>
                            </select>
                        </div>
                    </div>
                    <div><label className="block text-sm text-gray-300 mb-1">URL image</label><input type="url" value={blogForm.image_url} onChange={(e) => setBlogForm({ ...blogForm, image_url: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => { setShowBlogForm(false); setEditingPost(null); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Annuler</button>
                        <button type="submit" disabled={savingPost} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg disabled:opacity-50">
                            {savingPost ? <FaSpinner className="animate-spin mx-auto" /> : editingPost ? 'Modifier' : 'Publier'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ============================================
                MODAL MODIFICATION UTILISATEUR
            ============================================ */}
            <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title="Modifier l'utilisateur" maxWidth="md">
                <form onSubmit={handleEditUser} className="space-y-4">
                    <div><label className="block text-sm text-gray-300 mb-1">Nom complet</label><input type="text" value={editUserForm.fullname} onChange={(e) => setEditUserForm({ ...editUserForm, fullname: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Email</label><input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Province</label><select value={editUserForm.province} onChange={(e) => setEditUserForm({ ...editUserForm, province: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="">Sélectionnez</option>{provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Ville</label><input type="text" value={editUserForm.city} onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Rôle</label><select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="user">Utilisateur</option><option value="agent">Agent</option><option value="admin">Admin</option></select></div>
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Annuler</button>
                        <button type="submit" className="flex-1 bg-yellow-500 text-black py-2 rounded-lg">Enregistrer</button>
                    </div>
                </form>
            </Modal>

            {/* ============================================
                MODAL MODIFICATION AGENT
            ============================================ */}
            <Modal isOpen={showEditAgentModal} onClose={() => setShowEditAgentModal(false)} title="Modifier l'agent" maxWidth="md">
                <form onSubmit={handleEditAgent} className="space-y-4">
                    <div><label className="block text-sm text-gray-300 mb-1">Nom complet</label><input type="text" value={editAgentForm.fullname} onChange={(e) => setEditAgentForm({ ...editAgentForm, fullname: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Province</label><select value={editAgentForm.province} onChange={(e) => setEditAgentForm({ ...editAgentForm, province: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="">Sélectionnez</option>{provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Nom agence</label><input type="text" value={editAgentForm.agency_name} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Adresse agence</label><textarea value={editAgentForm.agency_address} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_address: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Téléphone agence</label><input type="tel" value={editAgentForm.agency_phone} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_phone: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowEditAgentModal(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Annuler</button>
                        <button type="submit" className="flex-1 bg-yellow-500 text-black py-2 rounded-lg">Enregistrer</button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
}

export default AdminPanel;