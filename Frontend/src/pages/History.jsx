// src/pages/History.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaSearch, FaDownload, FaFilePdf, FaFileExcel,
    FaPrint, FaCalendarAlt, FaChevronLeft,
    FaChevronRight, FaSpinner, FaReceipt,
    FaChartLine, FaMoneyBillWave,
    FaCheckCircle, FaClock, FaTimes,
    FaArrowUp, FaArrowDown, FaWallet,
    FaPiggyBank, FaHourglassHalf,
    FaCoins, FaCreditCard, FaLandmark,
    FaFileInvoice, FaHandHoldingUsd
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================
// HELPERS
// ============================================
const getToken = () =>
    localStorage.getItem('accessToken') || localStorage.getItem('token');

const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

const generateQRBase64 = async (text, size = 200) => {
    try {
        const dataUrl = await QRCode.toDataURL(text, {
            width: size,
            margin: 1,
            color: { dark: '#1e3a5f', light: '#ffffff' },
            errorCorrectionLevel: 'M'
        });
        return dataUrl;
    } catch (error) {
        console.error('❌ Erreur QR:', error);
        return null;
    }
};

function History({ user }) {
    const [transactions, setTransactions] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [savingsTransactions, setSavingsTransactions] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [cardTransactions, setCardTransactions] = useState([]);
    const [taxPayments, setTaxPayments] = useState([]);
    const [loanHistory, setLoanHistory] = useState([]);
    const [billPayments, setBillPayments] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (user) fetchAllHistory();
    }, [page, dateRange, user]);

    // ============================================
    // CHARGEMENT
    // ============================================
    const fetchAllHistory = async () => {
        setLoading(true);
        try {
            const headers = getAuthHeaders();

            let url = `${API_URL}/api/wallet/history?limit=50&offset=${(page - 1) * 50}`;
            if (dateRange.start) url += `&startDate=${dateRange.start}`;
            if (dateRange.end) url += `&endDate=${dateRange.end}`;

            console.log('📡 Chargement historique:', url);

            const [
                txResponse,
                investmentsResponse,
                savingsResponse,
                withdrawalResponse,
                cardResponse,
                taxResponse,
                loanResponse,
                billResponse
            ] = await Promise.all([
                axios.get(url, headers).catch(() => ({ data: { transactions: [], total: 0 } })),
                axios.get(`${API_URL}/api/investment/my-investments`, headers).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/api/savings/transactions`, headers).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/api/savings/withdrawal-requests`, headers).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/api/cards/my-transactions`, headers).catch(() => ({ data: { transactions: [] } })),
                axios.get(`${API_URL}/api/tax/payments`, headers).catch(() => ({ data: { payments: [] } })),
                axios.get(`${API_URL}/api/loans/my-loans`, headers).catch(() => ({ data: { loans: [] } })),
                axios.get(`${API_URL}/api/bills/my-payments`, headers).catch(() => ({ data: { payments: [] } }))
            ]);

            const walletTransactions = txResponse?.data?.transactions || [];
            const investmentsData = investmentsResponse?.data?.data || investmentsResponse?.data || [];
            const savingsData = savingsResponse?.data?.data || [];
            const withdrawalData = withdrawalResponse?.data?.data || [];
            const cardData = cardResponse?.data?.transactions || [];
            const taxData = taxResponse?.data?.payments || [];
            const loanData = loanResponse?.data?.loans || loanResponse?.data?.data || [];
            const billData = billResponse?.data?.payments || billResponse?.data?.data || [];

            console.log('📊 Données chargées:', {
                transactions: walletTransactions.length,
                investments: investmentsData.length,
                savings: savingsData.length,
                withdrawals: withdrawalData.length,
                cards: cardData.length,
                taxes: taxData.length,
                loans: loanData.length,
                bills: billData.length
            });

            setTransactions(walletTransactions);
            setTotal(txResponse?.data?.total || 0);
            setInvestments(Array.isArray(investmentsData) ? investmentsData : []);
            setSavingsTransactions(Array.isArray(savingsData) ? savingsData : []);
            setWithdrawalRequests(Array.isArray(withdrawalData) ? withdrawalData : []);
            setCardTransactions(Array.isArray(cardData) ? cardData : []);
            setTaxPayments(Array.isArray(taxData) ? taxData : []);
            setLoanHistory(Array.isArray(loanData) ? loanData : []);
            setBillPayments(Array.isArray(billData) ? billData : []);

            const merged = [
                ...(Array.isArray(walletTransactions) ? walletTransactions.map(tx => ({
                    ...tx,
                    item_type: 'transaction',
                    item_date: tx.created_at,
                    type_label: getTransactionTypeLabel(tx.transaction_type || tx.type),
                    status_label: getStatusLabel(tx.status)
                })) : []),
                ...(Array.isArray(investmentsData) ? investmentsData.map(inv => ({
                    id: `inv-${inv.id}`,
                    reference: `INV-${inv.id}`,
                    amount: inv.amount,
                    fee: 0,
                    net_amount: inv.amount,
                    status: inv.status || 'active',
                    status_label: getInvestmentStatusLabel(inv.status),
                    description: `Investissement dans ${inv.company_name || 'entreprise'}`,
                    created_at: inv.created_at,
                    receiver_name: inv.company_name,
                    company_name: inv.company_name,
                    shares: inv.shares,
                    share_price: inv.share_price,
                    item_type: 'investment',
                    item_date: inv.created_at,
                    type_label: 'Investissement'
                })) : []),
                ...(Array.isArray(savingsData) ? savingsData.map(st => ({
                    id: `sav-${st.id}`,
                    reference: st.reference || `SAV-${st.id}`,
                    amount: st.amount,
                    fee: st.fee || 0,
                    net_amount: st.net_amount || st.amount,
                    status: st.status || 'completed',
                    status_label: getStatusLabel(st.status),
                    description: getSavingsDescription(st),
                    created_at: st.created_at,
                    savings_id: st.savings_id,
                    savings_name: st.savings_name,
                    savings_type: st.savings_type,
                    balance_before: st.balance_before,
                    balance_after: st.balance_after,
                    transaction_type: st.type,
                    item_type: 'savings',
                    item_date: st.created_at,
                    type_label: getSavingsTypeLabel(st.type)
                })) : []),
                ...(Array.isArray(withdrawalData) ? withdrawalData.map(wr => ({
                    id: `wdr-${wr.id}`,
                    reference: `WDR-${wr.id}`,
                    amount: wr.amount,
                    status: wr.status || 'pending',
                    status_label: getStatusLabel(wr.status),
                    description: `Demande retrait - ${wr.savings_name}`,
                    created_at: wr.requested_at,
                    savings_name: wr.savings_name,
                    admin_comment: wr.admin_comment,
                    item_type: 'savings_request',
                    item_date: wr.requested_at,
                    type_label: 'Demande retrait'
                })) : []),
                ...(Array.isArray(cardData) ? cardData.map(ct => ({
                    id: `card-${ct.id}`,
                    reference: ct.receipt_number || `CARD-${ct.id}`,
                    amount: ct.amount,
                    fee: ct.fee || 0,
                    net_amount: ct.total_amount || ct.amount,
                    status: ct.status || 'completed',
                    status_label: getStatusLabel(ct.status),
                    description: `Paiement par carte - ${ct.description || 'Achat'}`,
                    created_at: ct.created_at,
                    card_last4: ct.card_number?.slice(-4),
                    merchant_name: ct.merchant_name,
                    merchant_id: ct.merchant_id,
                    card_holder_name: ct.holder_name,
                    item_type: 'card',
                    item_date: ct.created_at,
                    type_label: 'Carte bancaire'
                })) : []),
                ...(Array.isArray(taxData) ? taxData.map(tp => ({
                    id: `tax-${tp.id}`,
                    reference: tp.receipt_number || `TAX-${tp.id}`,
                    amount: tp.amount,
                    fee: tp.fee || 0,
                    net_amount: tp.total_amount || tp.amount,
                    status: tp.payment_status || 'paid',
                    status_label: getStatusLabel(tp.payment_status),
                    description: `${tp.tax_type} - ${tp.tax_period || ''}`,
                    created_at: tp.payment_date,
                    tax_type: tp.tax_type,
                    tax_period: tp.tax_period,
                    taxpayer_name: tp.taxpayer_name,
                    taxpayer_phone: tp.taxpayer_phone,
                    commune_name: tp.commune_name || tp.office_name,
                    item_type: 'tax',
                    item_date: tp.payment_date,
                    type_label: 'Taxe / Impôt'
                })) : []),
                ...(Array.isArray(loanData) ? loanData.map(loan => ({
                    id: `loan-${loan.id}`,
                    reference: loan.reference || `LOAN-${loan.id}`,
                    amount: loan.amount || loan.amount_requested,
                    fee: loan.interest || 0,
                    net_amount: loan.total_due || loan.amount,
                    status: loan.status || 'pending',
                    status_label: getLoanStatusLabel(loan.status),
                    description: `Prêt - ${loan.purpose || loan.loan_type || 'Personnel'}`,
                    created_at: loan.created_at || loan.requested_at,
                    loan_type: loan.loan_type,
                    interest_rate: loan.interest_rate,
                    duration_months: loan.duration_months,
                    monthly_payment: loan.monthly_payment,
                    amount_paid: loan.amount_paid,
                    remaining_amount: loan.remaining_amount,
                    item_type: 'loan',
                    item_date: loan.created_at || loan.requested_at,
                    type_label: 'Prêt'
                })) : []),
                ...(Array.isArray(billData) ? billData.map(bill => ({
                    id: `bill-${bill.id}`,
                    reference: bill.receipt_number || bill.reference || `BILL-${bill.id}`,
                    amount: bill.amount,
                    fee: bill.fee || 0,
                    net_amount: bill.total_amount || bill.amount,
                    status: bill.status || 'paid',
                    status_label: getStatusLabel(bill.status),
                    description: `${bill.bill_type || bill.company_name || 'Facture'}`,
                    created_at: bill.payment_date || bill.created_at,
                    company_name: bill.company_name,
                    bill_type: bill.bill_type,
                    customer_number: bill.customer_number,
                    item_type: 'bill',
                    item_date: bill.payment_date || bill.created_at,
                    type_label: 'Facture'
                })) : [])
            ];

            merged.sort((a, b) => {
                const dateA = new Date(a.item_date || 0).getTime();
                const dateB = new Date(b.item_date || 0).getTime();
                return dateB - dateA;
            });

            setAllTransactions(merged);
            console.log('✅ Total fusionné:', merged.length);

        } catch (error) {
            console.error('❌ Erreur fetchAllHistory:', error);
            toast.error('Erreur chargement de l\'historique');
            setAllTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // LABELS
    // ============================================
    const getTransactionTypeLabel = (type) => {
        const labels = {
            'transfer': 'Transfert', 'deposit': 'Dépôt', 'withdrawal': 'Retrait',
            'bill_payment': 'Facture', 'investments': 'Investissement', 'bus_booking': 'Bus',
            'fee_collection': 'Frais', 'tax_payment': 'Taxe', 'card_payment': 'Carte',
            'loan_disbursement': 'Prêt reçu', 'loan_repayment': 'Remboursement',
            'refund': 'Remboursement', 'travel_payment': 'Voyage'
        };
        return labels[type] || type || 'Transaction';
    };

    const getSavingsTypeLabel = (type) => {
        const labels = {
            'deposit': 'Dépôt épargne', 'withdrawal': 'Retrait épargne',
            'interest': 'Intérêts', 'penalty': 'Pénalité'
        };
        return labels[type] || 'Épargne';
    };

    const getSavingsDescription = (st) => {
        const type = st.type;
        const name = st.savings_name || 'Épargne';
        if (type === 'deposit') return `Dépôt dans "${name}"`;
        if (type === 'withdrawal') return `Retrait de "${name}"`;
        if (type === 'interest') return `Intérêts sur "${name}"`;
        return `Transaction "${name}"`;
    };

    const getInvestmentStatusLabel = (status) => {
        const labels = { 'active': 'Actif', 'pending': 'En attente', 'completed': 'Complété', 'cancelled': 'Annulé' };
        return labels[status] || 'Actif';
    };

    const getLoanStatusLabel = (status) => {
        const labels = {
            'pending': 'En attente', 'approved': 'Approuvé', 'rejected': 'Rejeté',
            'disbursed': 'Décaissé', 'active': 'Actif', 'repaid': 'Remboursé', 'defaulted': 'En défaut'
        };
        return labels[status] || 'En attente';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'completed': 'Complété', 'pending': 'En attente', 'failed': 'Échoué',
            'cancelled': 'Annulé', 'active': 'Actif', 'approved': 'Approuvé',
            'rejected': 'Rejeté', 'paid': 'Payé', 'processing': 'Traitement',
            'disbursed': 'Décaissé', 'repaid': 'Remboursé'
        };
        return labels[status] || status || 'Complété';
    };

    // ============================================
    // FORMATAGE
    // ============================================
    const formatAmount = (amount) => {
        if (amount === null || amount === undefined) return '0 FCFA';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '0 FCFA';
        return numAmount.toLocaleString('fr-FR') + ' FCFA';
    };

    const formatAmountNumber = (amount) => {
        if (amount === null || amount === undefined) return '0';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '0';
        return numAmount.toLocaleString('fr-FR') + ' FCFA';
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).toUpperCase();
        } catch { return dateStr; }
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch { return dateStr; }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateStr; }
    };

    // ============================================
    // COULEURS + ICONES
    // ============================================
    const getItemColors = (item) => {
        const colors = {
            card: { bg: 'bg-gradient-to-r from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: 'bg-purple-500/20 text-purple-400', text: 'text-purple-400' },
            tax: { bg: 'bg-gradient-to-r from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', icon: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' },
            loan: { bg: 'bg-gradient-to-r from-orange-500/10 to-orange-500/5', border: 'border-orange-500/20', icon: 'bg-orange-500/20 text-orange-400', text: 'text-orange-400' },
            bill: { bg: 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5', border: 'border-yellow-500/20', icon: 'bg-yellow-500/20 text-yellow-400', text: 'text-yellow-400' },
            investment: { bg: 'bg-gradient-to-r from-green-500/10 to-green-500/5', border: 'border-green-500/20', icon: 'bg-green-500/20 text-green-400', text: 'text-green-400' },
            savings: { bg: 'bg-gradient-to-r from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: 'bg-purple-500/20 text-purple-400', text: 'text-purple-400' },
            savings_request: { bg: 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5', border: 'border-yellow-500/20', icon: 'bg-yellow-500/20 text-yellow-400', text: 'text-yellow-400' },
            transaction: { bg: 'bg-white/5', border: '', icon: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' }
        };
        return colors[item.item_type] || colors.transaction;
    };

    const getItemIcon = (item) => {
        const icons = {
            card: <FaCreditCard />, tax: <FaLandmark />, loan: <FaHandHoldingUsd />,
            bill: <FaFileInvoice />, investment: <FaChartLine />, savings_request: <FaHourglassHalf />
        };
        if (icons[item.item_type]) return icons[item.item_type];
        if (item.item_type === 'savings') {
            if (item.transaction_type === 'deposit') return <FaArrowUp />;
            if (item.transaction_type === 'withdrawal') return <FaArrowDown />;
            if (item.transaction_type === 'interest') return <FaCoins />;
            return <FaPiggyBank />;
        }
        return item.sender_phone === user?.phone ? <FaArrowUp /> : <FaArrowDown />;
    };

    const getAmountSign = (item) => {
        if (['investment', 'card', 'tax', 'bill'].includes(item.item_type)) return '-';
        if (item.item_type === 'loan') return '+';
        if (item.item_type === 'savings') {
            if (item.transaction_type === 'deposit') return '-';
            return '+';
        }
        if (item.item_type === 'savings_request') return '⏳';
        return item.sender_phone === user?.phone ? '-' : '+';
    };

    // ============================================
    // REÇU PDF A4 AVEC QR
    // ============================================
    const generateReceiptPDF = async (item) => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const centerX = pageWidth / 2;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            const themeColors = {
                card: { primary: [124, 58, 237], secondary: [168, 85, 247], light: [243, 232, 255] },
                tax: { primary: [30, 58, 95], secondary: [59, 130, 246], light: [219, 234, 254] },
                loan: { primary: [234, 88, 12], secondary: [249, 115, 22], light: [254, 215, 170] },
                bill: { primary: [180, 83, 9], secondary: [234, 179, 8], light: [254, 243, 199] },
                investment: { primary: [22, 163, 74], secondary: [34, 197, 94], light: [220, 252, 231] },
                savings: { primary: [139, 92, 246], secondary: [167, 139, 250], light: [245, 243, 255] },
                savings_request: { primary: [202, 138, 4], secondary: [250, 204, 21], light: [254, 249, 195] },
                transaction: { primary: [30, 58, 95], secondary: [59, 130, 246], light: [219, 234, 254] }
            };
            const theme = themeColors[item.item_type] || themeColors.transaction;

            const typeTitles = {
                card: 'REÇU DE PAIEMENT',
                tax: 'REÇU OFFICIEL D\'IMPÔT',
                loan: 'REÇU DE PRÊT',
                bill: 'REÇU DE PAIEMENT',
                investment: 'CERTIFICAT D\'INVESTISSEMENT',
                savings: 'REÇU D\'ÉPARGNE',
                savings_request: 'DEMANDE DE RETRAIT',
                transaction: 'REÇU DE TRANSACTION'
            };

            // Bandeau
            doc.setFillColor(...theme.primary);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setFillColor(...theme.secondary);
            doc.circle(pageWidth - 25, 10, 30, 'F');
            doc.circle(25, 35, 22, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('AlkherPay', margin, 20);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Plateforme de paiement sécurisée', margin, 27);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(typeTitles[item.item_type] || 'REÇU', pageWidth - margin, 18, { align: 'right' });

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(`N° ${item.reference}`, pageWidth - margin, 24, { align: 'right' });
            doc.text(`Émis le ${new Date().toLocaleString('fr-FR')}`, pageWidth - margin, 29, { align: 'right' });

            // Statut
            const statusColors = {
                completed: [22, 163, 74], paid: [22, 163, 74], approved: [22, 163, 74],
                active: [22, 163, 74], pending: [234, 179, 8], processing: [59, 130, 246],
                failed: [220, 38, 38], rejected: [220, 38, 38], cancelled: [107, 114, 128],
                disbursed: [59, 130, 246], repaid: [22, 163, 74]
            };
            const statusColor = statusColors[item.status] || [107, 114, 128];

            doc.setFillColor(...statusColor);
            doc.roundedRect(pageWidth - 60, 44, 45, 8, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text((item.status_label || 'COMPLÉTÉ').toUpperCase(), pageWidth - 37.5, 49.5, { align: 'center' });

            // Montant
            doc.setFillColor(...theme.light);
            doc.roundedRect(margin, 58, contentWidth, 24, 3, 3, 'F');
            doc.setDrawColor(...theme.primary);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, 58, contentWidth, 24, 3, 3, 'S');

            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('MONTANT DE LA TRANSACTION', margin + 5, 65);

            doc.setTextColor(...theme.primary);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(formatAmount(item.amount), margin + 5, 77);

            // Informations
            let y = 90;
            doc.setFillColor(...theme.primary);
            doc.rect(margin, y - 4, 2, 6, 'F');
            doc.setTextColor(...theme.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATIONS GÉNÉRALES', margin + 5, y);
            y += 8;

            const addRow = (label, value) => {
                doc.setFillColor(250, 250, 250);
                doc.roundedRect(margin, y - 3.5, contentWidth, 7, 1, 1, 'F');
                doc.setTextColor(120, 120, 120);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(label, margin + 4, y);
                doc.setTextColor(30, 30, 30);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(String(value || '-').substring(0, 60), pageWidth - margin - 4, y, { align: 'right' });
                y += 9;
            };

            addRow('Référence', item.reference);
            addRow('Date & Heure', formatDateTime(item.created_at));
            addRow('Type', item.type_label?.toUpperCase());
            addRow('Statut', item.status_label?.toUpperCase());

            y += 3;

            if (item.item_type === 'card') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DE LA CARTE', margin + 5, y);
                y += 8;
                addRow('Carte', `**** **** **** ${item.card_last4 || 'N/A'}`);
                if (item.merchant_name) addRow('Marchand', item.merchant_name);
            }

            if (item.item_type === 'tax') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DE LA TAXE', margin + 5, y);
                y += 8;
                if (item.tax_type) addRow('Type', item.tax_type);
                if (item.tax_period) addRow('Période', item.tax_period);
                if (item.commune_name) addRow('Commune', item.commune_name);
                if (item.taxpayer_name) addRow('Contribuable', item.taxpayer_name);
            }

            if (item.item_type === 'loan') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DU PRÊT', margin + 5, y);
                y += 8;
                if (item.loan_type) addRow('Type', item.loan_type);
                if (item.interest_rate) addRow('Taux', `${item.interest_rate}%`);
                if (item.duration_months) addRow('Durée', `${item.duration_months} mois`);
            }

            if (item.item_type === 'bill') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DE LA FACTURE', margin + 5, y);
                y += 8;
                if (item.company_name) addRow('Fournisseur', item.company_name);
                if (item.bill_type) addRow('Type', item.bill_type);
            }

            if (item.item_type === 'investment') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DE L\'INVESTISSEMENT', margin + 5, y);
                y += 8;
                if (item.company_name) addRow('Entreprise', item.company_name);
                if (item.shares) addRow('Actions', item.shares);
            }

            if (item.item_type === 'savings' || item.item_type === 'savings_request') {
                doc.setFillColor(...theme.primary);
                doc.rect(margin, y - 4, 2, 6, 'F');
                doc.setTextColor(...theme.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('DÉTAILS DE L\'ÉPARGNE', margin + 5, y);
                y += 8;
                if (item.savings_name) addRow('Épargne', item.savings_name);
                if (item.balance_after) addRow('Solde après', formatAmount(item.balance_after));
            }

            // Récap financier
            y += 3;
            doc.setFillColor(...theme.primary);
            doc.rect(margin, y - 4, 2, 6, 'F');
            doc.setTextColor(...theme.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('RÉCAPITULATIF', margin + 5, y);
            y += 10;

            addRow('Montant', formatAmount(item.amount));
            if (item.fee > 0) addRow('Frais', formatAmount(item.fee));

            doc.setFillColor(...theme.primary);
            doc.roundedRect(margin, y - 3, contentWidth, 12, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('MONTANT TOTAL', margin + 4, y + 5);
            doc.setFontSize(14);
            doc.text(formatAmount(item.net_amount || item.amount), pageWidth - margin - 4, y + 5.5, { align: 'right' });

            // Pied de page + QR
            const footerY = 255;
            doc.setDrawColor(...theme.primary);
            doc.setLineWidth(0.5);
            doc.line(margin, footerY, pageWidth - margin, footerY);

            const qrContent = [
                'AlkherPay',
                `Ref: ${item.reference || 'N/A'}`,
                `Montant: ${formatAmount(item.amount)}`,
                `Date: ${formatDateShort(item.created_at)}`,
                `Statut: ${item.status_label || 'Complété'}`
            ].join('\n');

            const qrBase64 = await generateQRBase64(qrContent, 250);
            if (qrBase64) {
                doc.addImage(qrBase64, 'PNG', pageWidth - 38, footerY + 3, 24, 24, undefined, 'FAST');
                doc.setTextColor(120, 120, 120);
                doc.setFontSize(5);
                doc.text('Scannez pour vérifier', pageWidth - 26, footerY + 30, { align: 'center' });
            }

            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('AlkherPay - GOUROUSDJA', margin, footerY + 8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Service client: 62 78 73 07', margin, footerY + 13);
            doc.text('Email: support@alkherpay.td', margin, footerY + 17);

            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text('Document généré électroniquement.', centerX, pageHeight - 5, { align: 'center' });

            doc.save(`recu_${item.reference || 'transaction'}.pdf`);
            toast.success('Reçu téléchargé');

        } catch (error) {
            console.error('❌ Erreur reçu:', error);
            toast.error('Erreur génération reçu');
        }
    };

    // ============================================
    // PDF HISTORIQUE COMPLET
    // ============================================
    const generatePDF = async () => {
        setExporting(true);
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            const filtered = getFilteredItems();

            const qrContent = [
                'AlkherPay - Historique',
                `Utilisateur: ${user?.fullname || 'N/A'}`,
                `Transactions: ${filtered.length}`
            ].join('\n');

            const qrBase64 = await generateQRBase64(qrContent, 150);

            doc.setFillColor(30, 58, 95);
            doc.rect(0, 0, pageWidth, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('AlkherPay', margin, 18);
            doc.setFontSize(12);
            doc.text('HISTORIQUE DES TRANSACTIONS', pageWidth - margin, 18, { align: 'right' });

            let y = 50;
            const typeLabels = {
                transaction: 'TRANSFERT', investment: 'INVESTISSEMENT',
                savings: 'ÉPARGNE', savings_request: 'RETRAIT',
                card: 'CARTE', tax: 'TAXE', loan: 'PRÊT', bill: 'FACTURE'
            };

            const tableData = filtered.map(item => [
                item.reference || '-',
                formatDateShort(item.created_at),
                typeLabels[item.item_type] || 'AUTRE',
                item.item_type === 'card' ? `**** ${item.card_last4}` :
                item.item_type === 'tax' ? item.commune_name :
                item.item_type === 'loan' ? item.loan_type :
                item.item_type === 'bill' ? item.company_name :
                item.item_type === 'investment' ? item.company_name :
                item.item_type === 'savings' ? item.savings_name :
                (item.sender_phone === user?.phone ? item.receiver_name : item.sender_name),
                formatAmountNumber(item.amount),
                item.fee > 0 ? formatAmountNumber(item.fee) : '-',
                formatAmountNumber(item.net_amount || item.amount),
                item.status_label || 'COMPLETE'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Référence', 'Date', 'Type', 'Partenaire', 'Montant', 'Frais', 'Net', 'Statut']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 58, 95], textColor: [255, 255, 255],
                    fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2
                },
                bodyStyles: { fontSize: 6, cellPadding: 1.5, textColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                margin: { left: margin, right: margin },
                didDrawPage: () => {
                    const pageCount = doc.internal.getNumberOfPages();
                    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

                    doc.setFillColor(245, 247, 250);
                    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
                    if (qrBase64) {
                        doc.addImage(qrBase64, 'PNG', pageWidth - 18, pageHeight - 13, 11, 11, undefined, 'FAST');
                    }
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(6);
                    doc.text(`AlkherPay - Page ${currentPage} / ${pageCount}`, margin, pageHeight - 5);
                    doc.text('Service client: 62 78 73 07', pageWidth - margin - 25, pageHeight - 5, { align: 'right' });
                }
            });

            doc.save(`historique_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF téléchargé');
        } catch (error) {
            console.error('❌ Erreur PDF:', error);
            toast.error('Erreur génération PDF');
        } finally {
            setExporting(false);
        }
    };

    // ============================================
    // CSV
    // ============================================
    const exportToCSV = () => {
        try {
            const filtered = getFilteredItems();
            const headers = ['Référence', 'Date', 'Type', 'Partenaire', 'Montant', 'Frais', 'Net', 'Statut'];
            const rows = filtered.map(item => [
                item.reference || '',
                formatDateTime(item.created_at),
                item.item_type,
                item.item_type === 'card' ? `**** ${item.card_last4}` :
                item.item_type === 'tax' ? item.commune_name :
                item.item_type === 'loan' ? item.loan_type :
                item.item_type === 'bill' ? item.company_name :
                item.item_type === 'investment' ? item.company_name :
                item.item_type === 'savings' ? item.savings_name :
                (item.sender_phone === user?.phone ? item.receiver_name : item.sender_name),
                item.amount,
                item.fee || 0,
                item.net_amount || item.amount,
                item.status_label || 'Complété'
            ]);

            const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `historique_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('CSV exporté');
        } catch (error) {
            console.error('❌ Erreur CSV:', error);
            toast.error('Erreur export CSV');
        }
    };

    // ============================================
    // IMPRIMER
    // ============================================
    const printHistory = () => {
        const filtered = getFilteredItems();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>AlkherPay - Historique</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
                    .header { background: #1e3a5f; color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #eee; }
                    th { background: #1e3a5f; color: white; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>AlkherPay</h1>
                    <p>Historique - ${filtered.length} transactions</p>
                </div>
                <table>
                    <thead>
                        <tr><th>Référence</th><th>Date</th><th>Type</th><th>Montant</th><th>Statut</th></tr>
                    </thead>
                    <tbody>
                        ${filtered.map(item => `
                            <tr>
                                <td>${item.reference || '-'}</td>
                                <td>${formatDateShort(item.created_at)}</td>
                                <td>${item.type_label}</td>
                                <td>${formatAmount(item.amount)}</td>
                                <td>${item.status_label}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.print();
        printWindow.close();
    };

    // ============================================
    // FILTRES + STATS
    // ============================================
    const getFilteredItems = () => {
        let filtered = allTransactions;
        if (filter === 'sent') filtered = filtered.filter(t => t.item_type === 'transaction' && t.sender_phone === user?.phone);
        else if (filter === 'received') filtered = filtered.filter(t => t.item_type === 'transaction' && t.receiver_phone === user?.phone);
        else if (filter === 'investments') filtered = filtered.filter(t => t.item_type === 'investment');
        else if (filter === 'transactions') filtered = filtered.filter(t => t.item_type === 'transaction');
        else if (filter === 'savings') filtered = filtered.filter(t => t.item_type === 'savings' || t.item_type === 'savings_request');
        else if (filter === 'cards') filtered = filtered.filter(t => t.item_type === 'card');
        else if (filter === 'taxes') filtered = filtered.filter(t => t.item_type === 'tax');
        else if (filter === 'loans') filtered = filtered.filter(t => t.item_type === 'loan');
        else if (filter === 'bills') filtered = filtered.filter(t => t.item_type === 'bill');

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.reference?.toLowerCase().includes(search) ||
                t.sender_name?.toLowerCase().includes(search) ||
                t.receiver_name?.toLowerCase().includes(search) ||
                t.company_name?.toLowerCase().includes(search) ||
                t.savings_name?.toLowerCase().includes(search) ||
                t.merchant_name?.toLowerCase().includes(search) ||
                t.commune_name?.toLowerCase().includes(search) ||
                t.taxpayer_name?.toLowerCase().includes(search)
            );
        }
        return filtered;
    };

    const filteredItems = getFilteredItems();

    const getStatusBadge = (status) => {
        const statusColors = {
            completed: 'bg-green-500/20 text-green-400',
            paid: 'bg-green-500/20 text-green-400',
            active: 'bg-green-500/20 text-green-400',
            approved: 'bg-green-500/20 text-green-400',
            pending: 'bg-yellow-500/20 text-yellow-400',
            processing: 'bg-blue-500/20 text-blue-400',
            failed: 'bg-red-500/20 text-red-400',
            rejected: 'bg-red-500/20 text-red-400',
            cancelled: 'bg-red-500/20 text-red-400',
            disbursed: 'bg-blue-500/20 text-blue-400',
            repaid: 'bg-green-500/20 text-green-400'
        };
        return statusColors[status] || 'bg-gray-500/20 text-gray-400';
    };

    const stats = {
        totalSent: allTransactions.filter(t => t.item_type === 'transaction' && t.sender_phone === user?.phone).reduce((s, t) => s + (t.amount || 0), 0),
        totalReceived: allTransactions.filter(t => t.item_type === 'transaction' && t.receiver_phone === user?.phone).reduce((s, t) => s + (t.amount || 0), 0),
        totalInvested: allTransactions.filter(t => t.item_type === 'investment').reduce((s, t) => s + (t.amount || 0), 0),
        totalSavingsDeposits: allTransactions.filter(t => t.item_type === 'savings' && t.transaction_type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0),
        totalCards: allTransactions.filter(t => t.item_type === 'card').reduce((s, t) => s + (t.amount || 0), 0),
        totalTaxes: allTransactions.filter(t => t.item_type === 'tax').reduce((s, t) => s + (t.amount || 0), 0),
        totalLoans: allTransactions.filter(t => t.item_type === 'loan').reduce((s, t) => s + (t.amount || 0), 0),
        totalBills: allTransactions.filter(t => t.item_type === 'bill').reduce((s, t) => s + (t.amount || 0), 0),
        totalFees: allTransactions.reduce((s, t) => s + (t.fee || 0), 0)
    };

    const totalPages = Math.ceil(total / 50);

    // ============================================
    // RENDU
    // ============================================
    return (
        <Layout user={user}>
            <div className="card">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Historique</h2>
                    <button
                        onClick={fetchAllHistory}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        🔄 Actualiser
                    </button>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                                placeholder="Rechercher..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {[
                            { key: 'all', icon: FaWallet, label: 'Tous' },
                            { key: 'transactions', icon: FaMoneyBillWave, label: 'Transferts' },
                            { key: 'cards', icon: FaCreditCard, label: 'Cartes' },
                            { key: 'taxes', icon: FaLandmark, label: 'Taxes' },
                            { key: 'loans', icon: FaHandHoldingUsd, label: 'Prêts' },
                            { key: 'bills', icon: FaFileInvoice, label: 'Factures' },
                            { key: 'savings', icon: FaPiggyBank, label: 'Épargnes' },
                            { key: 'investments', icon: FaChartLine, label: 'Investissements' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                                    filter === f.key ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                                }`}
                            >
                                <f.icon /> {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date + Export */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                            showDateFilter ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                        }`}
                    >
                        <FaCalendarAlt /> Date
                    </button>

                    <div className="relative group">
                        <button className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all flex items-center gap-2">
                            <FaDownload /> Exporter
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-blue-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-10 min-w-[150px]">
                            <button onClick={generatePDF} disabled={exporting} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2">
                                {exporting ? <FaSpinner className="animate-spin" /> : <FaFilePdf />} PDF complet
                            </button>
                            <button onClick={exportToCSV} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2">
                                <FaFileExcel /> CSV
                            </button>
                            <button onClick={printHistory} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2">
                                <FaPrint /> Imprimer
                            </button>
                        </div>
                    </div>
                </div>

                {showDateFilter && (
                    <div className="bg-white/5 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="label text-sm">Date début</label>
                            <input type="date" value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="input-field" />
                        </div>
                        <div>
                            <label className="label text-sm">Date fin</label>
                            <input type="date" value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="input-field" />
                        </div>
                        <button onClick={() => setDateRange({ start: '', end: '' })}
                            className="text-red-400 text-sm hover:text-red-300">
                            Réinitialiser
                        </button>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-white/50 text-xs">Envoyé</p>
                        <p className="text-red-400 font-bold text-sm">{formatAmount(stats.totalSent)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-white/50 text-xs">Reçu</p>
                        <p className="text-green-400 font-bold text-sm">{formatAmount(stats.totalReceived)}</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-3 text-center border border-purple-500/20">
                        <p className="text-purple-300 text-xs">Cartes</p>
                        <p className="text-purple-400 font-bold text-sm">{formatAmount(stats.totalCards)}</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
                        <p className="text-blue-300 text-xs">Taxes</p>
                        <p className="text-blue-400 font-bold text-sm">{formatAmount(stats.totalTaxes)}</p>
                    </div>
                    <div className="bg-orange-500/10 rounded-xl p-3 text-center border border-orange-500/20">
                        <p className="text-orange-300 text-xs">Prêts</p>
                        <p className="text-orange-400 font-bold text-sm">{formatAmount(stats.totalLoans)}</p>
                    </div>
                    <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
                        <p className="text-yellow-300 text-xs">Factures</p>
                        <p className="text-yellow-400 font-bold text-sm">{formatAmount(stats.totalBills)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-white/50 text-xs">Investi</p>
                        <p className="text-green-400 font-bold text-sm">{formatAmount(stats.totalInvested)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-white/50 text-xs">Épargné</p>
                        <p className="text-purple-400 font-bold text-sm">{formatAmount(stats.totalSavingsDeposits)}</p>
                    </div>
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <FaSpinner className="text-white text-3xl animate-spin" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12">
                        <FaReceipt className="text-white/20 text-5xl mx-auto mb-3" />
                        <p className="text-white/50">Aucune transaction trouvée</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item) => {
                            const colors = getItemColors(item);
                            return (
                                <div
                                    key={`${item.item_type}-${item.id}`}
                                    className={`rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer ${colors.bg} ${colors.border} border`}
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <div className="flex flex-wrap justify-between items-start gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                                                {getItemIcon(item)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                                        {item.type_label}
                                                    </span>
                                                    <span className="text-white/40 text-xs font-mono">{item.reference}</span>
                                                </div>
                                                <p className="text-white font-medium">
                                                    {item.item_type === 'card' && <>💳 Carte ****{item.card_last4}</>}
                                                    {item.item_type === 'tax' && <>🏛️ {item.tax_type}</>}
                                                    {item.item_type === 'loan' && <>💰 Prêt {item.loan_type}</>}
                                                    {item.item_type === 'bill' && <>📄 {item.bill_type || 'Facture'}</>}
                                                    {item.item_type === 'investment' && <>📈 {item.company_name}</>}
                                                    {(item.item_type === 'savings' || item.item_type === 'savings_request') && <>{item.description}</>}
                                                    {item.item_type === 'transaction' && (
                                                        item.sender_phone === user?.phone
                                                            ? <>Envoi à <span className="text-blue-300">{item.receiver_name || item.receiver_phone}</span></>
                                                            : <>Réception de <span className="text-green-300">{item.sender_name || item.sender_phone}</span></>
                                                    )}
                                                </p>
                                                <p className="text-white/40 text-sm">{formatDate(item.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-bold text-lg ${colors.text}`}>
                                                {getAmountSign(item)}{formatAmount(item.amount)}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); generateReceiptPDF(item); }}
                                                className="text-green-400 text-xs hover:text-green-300 flex items-center gap-1 ml-auto mt-1"
                                            >
                                                <FaFilePdf size={12} /> Reçu
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20">
                            <FaChevronLeft />
                        </button>
                        <span className="px-4 py-1 text-white">Page {page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20">
                            <FaChevronRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Détails */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 rounded-t-2xl flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {getItemIcon(selectedItem)} Détails
                            </h3>
                            <button onClick={() => setShowDetailModal(false)}
                                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <p className={`text-3xl font-bold ${getItemColors(selectedItem).text}`}>
                                    {formatAmount(selectedItem.amount)}
                                </p>
                                <p className="text-white/50 text-sm font-mono mt-1">{selectedItem.reference}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-white/50">Date</span>
                                    <span className="text-white font-medium text-sm">{formatDateTime(selectedItem.created_at)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-white/50">Type</span>
                                    <span className={`font-medium ${getItemColors(selectedItem).text}`}>{selectedItem.type_label}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-white/50">Statut</span>
                                    <span className={`font-medium px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedItem.status)}`}>
                                        {selectedItem.status_label}
                                    </span>
                                </div>
                                {selectedItem.fee > 0 && (
                                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/50">Frais</span>
                                        <span className="text-yellow-400 font-medium">{formatAmount(selectedItem.fee)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => generateReceiptPDF(selectedItem)}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2"
                                >
                                    <FaFilePdf /> Reçu
                                </button>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="flex-1 bg-white/10 text-white py-2.5 rounded-lg hover:bg-white/20 transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default History;