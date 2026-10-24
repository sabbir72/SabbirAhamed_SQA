import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  QrCode,
  Phone,
  Mail,
  MapPin,
  RotateCw,
  ShieldCheck,
  Wifi,
  Camera,
  Printer,
  MessageSquare,
  Smartphone,
  Nfc,
  Upload,
  AlertCircle,
  FileText,
  ExternalLink,
  FileDown,
  Building2,
  Layers,
  Globe,
  Linkedin,
  Github,
  UserPlus,
  Code2,
  Sun,
  Moon,
} from 'lucide-react';
import { getStoredProfile, ProfileData } from '../utils/portfolioStore';
import {
  buildVCardString,
  downloadVCardFile,
  isWebNfcSupported,
  writeVisitingCardToNfc,
  playNfcTapAudio,
  getFormattedCardText,
  getEmailSignatureText,
  generateEmailSignatureHtml,
} from '../utils/vcardGenerator';
import {
  TeamMemberCard,
  DEFAULT_TEAM_MEMBERS,
  loadTeamMembers,
  loadVisitingCardConfig,
  VisitingCardConfig,
  VCARD_STORE_UPDATED_EVENT,
  sanitizePermanentCardUrl,
} from '../utils/visitingCardStore';

interface VisitingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'card' | 'scan' | 'nfc' | 'vcard' | 'print';
type QrMode = 'url' | 'vcard' | 'whatsapp' | 'linkedin';
type CardSkin = 'obsidian' | 'carbon-gold' | 'titanium' | 'emerald' | 'hologram';

interface CardSkinConfig {
  id: CardSkin;
  name: string;
  swatchClass: string;
  frontBg: string;
  backBg: string;
  accentColor: string;
  borderClass: string;
  chipGradient: string;
}

const CARD_SKINS: CardSkinConfig[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    swatchClass: 'bg-sky-400',
    frontBg: 'linear-gradient(135deg, #090D18 0%, #05080F 50%, #101728 100%)',
    backBg: 'linear-gradient(135deg, #060912 0%, #0C1220 100%)',
    accentColor: 'var(--color-accent, #00D2FF)',
    borderClass: 'border-white/20',
    chipGradient: 'from-amber-200 via-amber-400 to-amber-600',
  },
  {
    id: 'carbon-gold',
    name: 'Gold',
    swatchClass: 'bg-amber-400',
    frontBg: 'radial-gradient(circle at 60% 40%, #1A1A1A 0%, #080808 100%)',
    backBg: 'linear-gradient(135deg, #0B0B0B 0%, #181818 100%)',
    accentColor: '#F59E0B',
    borderClass: 'border-amber-500/40',
    chipGradient: 'from-yellow-100 via-amber-300 to-yellow-600',
  },
  {
    id: 'titanium',
    name: 'Titanium',
    swatchClass: 'bg-slate-300',
    frontBg: 'linear-gradient(145deg, #172133 0%, #0D1524 60%, #1B263B 100%)',
    backBg: 'linear-gradient(135deg, #0D1524 0%, #1E2B42 100%)',
    accentColor: '#38BDF8',
    borderClass: 'border-sky-400/35',
    chipGradient: 'from-slate-200 via-slate-400 to-slate-600',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatchClass: 'bg-emerald-400',
    frontBg: 'linear-gradient(135deg, #051A13 0%, #030F0B 50%, #0A291E 100%)',
    backBg: 'linear-gradient(135deg, #030F0B 0%, #0A241A 100%)',
    accentColor: '#10B981',
    borderClass: 'border-emerald-500/40',
    chipGradient: 'from-emerald-200 via-emerald-400 to-emerald-700',
  },
  {
    id: 'hologram',
    name: 'Prism',
    swatchClass: 'bg-purple-400',
    frontBg: 'linear-gradient(135deg, #140E2D 0%, #0A0C22 45%, #20133D 100%)',
    backBg: 'linear-gradient(135deg, #0C0F28 0%, #1F143D 100%)',
    accentColor: '#C084FC',
    borderClass: 'border-purple-400/40',
    chipGradient: 'from-purple-200 via-pink-400 to-indigo-600',
  },
];

export const VisitingCardModal: React.FC<VisitingCardModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<ProfileData>(getStoredProfile());
  const [activeTab, setActiveTab] = useState<TabType>('card');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<CardSkin>('obsidian');
  const [copied, setCopied] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<QrMode>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardBackQrUrl, setCardBackQrUrl] = useState<string>('');
  const [signatureLightPreview, setSignatureLightPreview] = useState(true);

  const [teamMembers, setTeamMembers] = useState<TeamMemberCard[]>(() => loadTeamMembers());
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>(() => {
    const list = loadTeamMembers();
    return list[0]?.id || 'sabbir-lead';
  });
  const [cardConfig, setCardConfig] = useState<VisitingCardConfig>(() => loadVisitingCardConfig());
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<'flip' | 'both'>('flip');

  // 3D Tilt State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // NFC states
  const [hasWebNfc, setHasWebNfc] = useState(false);
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [simulatedTapActive, setSimulatedTapActive] = useState(false);

  // Camera QR Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimationId = useRef<number | null>(null);

  const stopCameraScan = useCallback(() => {
    if (scanAnimationId.current) {
      cancelAnimationFrame(scanAnimationId.current);
      scanAnimationId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const updatedMembers = loadTeamMembers();
      setTeamMembers(updatedMembers);
      setSelectedTeamMemberId((prev) =>
        updatedMembers.some((m) => m.id === prev) ? prev : updatedMembers[0]?.id || 'sabbir-lead'
      );
      setCardConfig(loadVisitingCardConfig());
    };
    window.addEventListener(VCARD_STORE_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(VCARD_STORE_UPDATED_EVENT, handleSync);
  }, []);

  const cardUrl = sanitizePermanentCardUrl(cardConfig.permanentUrl);
  const userCompany = cardConfig.company || 'Altersense Ltd';
  const currentSkinConfig = CARD_SKINS.find((s) => s.id === selectedSkin) || CARD_SKINS[0];
  const selectedMember =
    teamMembers.find((m) => m.id === selectedTeamMemberId) ||
    teamMembers[0] ||
    DEFAULT_TEAM_MEMBERS[0];

  const displayedName = selectedMember.name;
  const displayedTitle = selectedMember.role;
  const displayedDepartment = selectedMember.department || cardConfig.department;
  const rawPhone = selectedMember.phone || profile.phone || '+8801681387906';
  const rawEmail = selectedMember.email || profile.email || 'sabbircse72@gmail.com';
  const displayedLocation = profile.location || 'Dhaka, Bangladesh';
  const linkedinFullUrl = profile.linkedin?.startsWith('http')
    ? profile.linkedin
    : `https://${profile.linkedin || 'www.linkedin.com/in/sabbir-ahamed72'}`;
  const githubFullUrl = profile.github?.startsWith('http')
    ? profile.github
    : `https://${profile.github || 'github.com/sabbir72'}`;

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredProfile());
      setTeamMembers(loadTeamMembers());
      setCardConfig(loadVisitingCardConfig());
      setHasWebNfc(isWebNfcSupported());
      setIsFlipped(false);
      setScanResult(null);
      setCameraError(null);
      setNfcStatus(null);
    } else {
      stopCameraScan();
    }
  }, [isOpen, stopCameraScan]);

  useEffect(() => {
    if (!isOpen) return;
    const generateCardBackQr = async () => {
      try {
        const url = await QRCode.toDataURL(cardUrl, {
          width: 420,
          margin: 1.5,
          color: { dark: '#080B11', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
        setCardBackQrUrl(url);
      } catch (err) {
        console.error('Card back QR generation failed:', err);
      }
    };
    generateCardBackQr();
  }, [isOpen, cardUrl]);

  useEffect(() => {
    if (!isOpen) return;

    let payload = cardUrl;
    if (qrMode === 'vcard') {
      const activeProfile: ProfileData = {
        ...profile,
        name: selectedMember.name,
        title: selectedMember.role,
        phone: rawPhone,
        email: rawEmail,
      };
      payload = buildVCardString(activeProfile, cardUrl);
    } else if (qrMode === 'whatsapp') {
      const clean = rawPhone.replace(/[^0-9]/g, '');
      payload = `https://wa.me/${clean}?text=${encodeURIComponent(
        `Hi ${selectedMember.name}, I connected via your digital business card.`
      )}`;
    } else if (qrMode === 'linkedin') {
      payload = linkedinFullUrl;
    }

    const generateQr = async () => {
      try {
        const url = await QRCode.toDataURL(payload, {
          width: 420,
          margin: 1.5,
          color: { dark: '#080B11', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    };
    generateQr();
  }, [isOpen, qrMode, selectedMember, rawPhone, rawEmail, profile, cardUrl, linkedinFullUrl]);

  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, [stopCameraScan]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normalizedX = (x / rect.width) * 2 - 1;
    const normalizedY = (y / rect.height) * 2 - 1;

    setTilt({
      rotateX: -normalizedY * 9,
      rotateY: normalizedX * 9,
      glareX: Math.round((x / rect.width) * 100),
      glareY: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  if (!isOpen) return null;

  const triggerCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2200);
  };

  const handleCopyValue = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    triggerCopied(key);
  };

  const handleDownloadVcf = () => {
    const activeProfile: ProfileData = {
      ...profile,
      name: selectedMember.name,
      title: selectedMember.role,
      phone: rawPhone,
      email: rawEmail,
    };
    downloadVCardFile(activeProfile);
    playNfcTapAudio();
    triggerCopied('vcf');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedMember.name} — ${selectedMember.role}`,
          text: `${selectedMember.name} • ${selectedMember.role} (${userCompany})`,
          url: cardUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    handleCopyValue(cardUrl, 'link');
  };

  const handleCopyAllInfo = () => {
    const text = getFormattedCardText(
      {
        ...profile,
        name: selectedMember.name,
        title: selectedMember.role,
        phone: rawPhone,
        email: rawEmail,
      },
      cardUrl
    );
    navigator.clipboard.writeText(text);
    triggerCopied('text');
  };

  const handleCopySignature = async () => {
    const activeProfile: ProfileData = {
      ...profile,
      name: selectedMember.name,
      title: selectedMember.role,
      phone: rawPhone,
      email: rawEmail,
    };
    const plainText = getEmailSignatureText(activeProfile, userCompany);
    const html = generateEmailSignatureHtml(activeProfile, cardUrl, userCompany);

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch {
      await navigator.clipboard.writeText(plainText);
    }
    triggerCopied('signature');
  };

  const handleCopySignatureHtml = () => {
    const activeProfile: ProfileData = {
      ...profile,
      name: selectedMember.name,
      title: selectedMember.role,
      phone: rawPhone,
      email: rawEmail,
    };
    const html = generateEmailSignatureHtml(activeProfile, cardUrl, userCompany);
    navigator.clipboard.writeText(html);
    triggerCopied('signature-html');
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${selectedMember.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerCopied('qr-png');
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const generateCardCanvas = (side: 'front' | 'back'): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1050;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(canvas);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (side === 'front') {
        const bgGrad = ctx.createLinearGradient(0, 0, 1050, 600);
        bgGrad.addColorStop(0, '#0B101D');
        bgGrad.addColorStop(0.5, '#060912');
        bgGrad.addColorStop(1, '#111827');
        ctx.fillStyle = bgGrad;
        drawRoundedRect(ctx, 0, 0, 1050, 600, 24);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, 0, 0, 1050, 600, 24);
        ctx.stroke();

        // Metallic Chip
        const chipGrad = ctx.createLinearGradient(60, 60, 180, 150);
        chipGrad.addColorStop(0, '#FDE68A');
        chipGrad.addColorStop(0.5, '#F59E0B');
        chipGrad.addColorStop(1, '#B45309');
        ctx.fillStyle = chipGrad;
        drawRoundedRect(ctx, 60, 60, 120, 90, 10);
        ctx.fill();
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(60, 103, 120, 3);
        ctx.fillRect(118, 60, 3, 90);

        // Contactless Wave
        ctx.strokeStyle = '#00D2FF';
        ctx.lineWidth = 4;
        [14, 24, 34].forEach((r) => {
          ctx.beginPath();
          ctx.arc(215, 105, r, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
        });

        // SQA Badge
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        drawRoundedRect(ctx, 860, 60, 130, 44, 22);
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#34D399';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText('SQA', 906, 89);

        // Identity
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(selectedMember.name.toUpperCase(), 60, 255);

        ctx.fillStyle = '#00D2FF';
        ctx.font = '600 24px "Inter", sans-serif';
        ctx.fillText(selectedMember.role, 60, 300);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 18px "Inter", sans-serif';
        ctx.fillText(`${userCompany} • ${displayedDepartment}`, 60, 340);

        // Divider
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 420);
        ctx.lineTo(990, 420);
        ctx.stroke();

        // Contacts
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '500 20px "JetBrains Mono", monospace';
        ctx.fillText(rawPhone, 60, 475);
        ctx.fillText(rawEmail, 60, 520);

        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(displayedLocation, 560, 475);
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('sabbir-sqa.vercel.app', 560, 520);

        resolve(canvas);
      } else {
        ctx.fillStyle = '#070A14';
        drawRoundedRect(ctx, 0, 0, 1050, 600, 24);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, 0, 0, 1050, 600, 24);
        ctx.stroke();

        ctx.fillStyle = '#02040A';
        ctx.fillRect(0, 44, 1050, 76);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 15px "JetBrains Mono", monospace';
        ctx.fillText(`${userCompany.toUpperCase()}  •  SOFTWARE QUALITY ASSURANCE`, 60, 88);

        const drawBackDetails = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(selectedMember.name, 480, 210);

          ctx.fillStyle = '#38BDF8';
          ctx.font = '600 19px "Inter", sans-serif';
          ctx.fillText(selectedMember.role, 480, 244);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '500 18px "JetBrains Mono", monospace';
          ctx.fillText(userCompany, 480, 305);
          ctx.fillText(rawPhone, 480, 345);
          ctx.fillText(rawEmail, 480, 385);
          ctx.fillText(displayedLocation, 480, 425);

          ctx.fillStyle = '#38BDF8';
          ctx.fillText('sabbir-sqa.vercel.app', 480, 475);

          resolve(canvas);
        };

        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, 60, 165, 360, 360, 18);
        ctx.fill();

        const activeQr = cardBackQrUrl || qrDataUrl;
        if (activeQr) {
          const qrImg = new Image();
          qrImg.onload = () => {
            ctx.drawImage(qrImg, 85, 185, 310, 310);
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SCAN TO CONNECT', 240, 512);
            ctx.textAlign = 'left';
            drawBackDetails();
          };
          qrImg.onerror = () => drawBackDetails();
          qrImg.src = activeQr;
        } else {
          drawBackDetails();
        }
      }
    });
  };

  const handleDownloadFrontPng = async () => {
    const canvas = await generateCardCanvas('front');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${selectedMember.name.replace(/\s+/g, '_')}_Card_Front.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerCopied('front-png');
  };

  const handleDownloadBackPng = async () => {
    const canvas = await generateCardCanvas('back');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${selectedMember.name.replace(/\s+/g, '_')}_Card_Back.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerCopied('back-png');
  };

  const handleDownloadFullPrintSheet = async () => {
    const frontCanvas = await generateCardCanvas('front');
    const backCanvas = await generateCardCanvas('back');

    const sheet = document.createElement('canvas');
    sheet.width = 1400;
    sheet.height = 1780;
    const ctx = sheet.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1400, 1780);

    ctx.fillStyle = '#0B101D';
    ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${selectedMember.name.toUpperCase()} — BUSINESS CARD`, 175, 105);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 17px "Inter", sans-serif';
    ctx.fillText(`${selectedMember.role} • ${userCompany}`, 175, 140);

    const cardX = 175;
    const frontY = 210;
    const cardW = 1050;
    const cardH = 600;

    const drawCrosshair = (cx: number, cy: number) => {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx, cy + 14);
      ctx.stroke();
    };

    ctx.drawImage(frontCanvas, cardX, frontY, cardW, cardH);
    drawCrosshair(cardX, frontY);
    drawCrosshair(cardX + cardW, frontY);
    drawCrosshair(cardX, frontY + cardH);
    drawCrosshair(cardX + cardW, frontY + cardH);

    const backY = 930;
    ctx.drawImage(backCanvas, cardX, backY, cardW, cardH);
    drawCrosshair(cardX, backY);
    drawCrosshair(cardX + cardW, backY);
    drawCrosshair(cardX, backY + cardH);
    drawCrosshair(cardX + cardW, backY + cardH);

    const a = document.createElement('a');
    a.href = sheet.toDataURL('image/png');
    a.download = `${selectedMember.name.replace(/\s+/g, '_')}_Business_Card_Sheet.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerCopied('sheet-png');
  };

  const handlePrintCards = () => {
    try {
      document.body.classList.add('printing-visiting-card');
      const cleanUp = () => {
        document.body.classList.remove('printing-visiting-card');
        window.removeEventListener('afterprint', cleanUp);
      };
      window.addEventListener('afterprint', cleanUp);
      window.print();
      setTimeout(cleanUp, 3000);
    } catch {
      handleDownloadFullPrintSheet();
    }
  };

  const handleSimulateNfcTap = () => {
    setSimulatedTapActive(true);
    playNfcTapAudio();
    setTimeout(() => {
      setSimulatedTapActive(false);
    }, 1600);
  };

  const handleWriteNfc = async () => {
    setNfcWriting(true);
    setNfcStatus('Hold your NFC card near the back of your phone...');
    const res = await writeVisitingCardToNfc(cardUrl);
    setNfcWriting(false);
    setNfcStatus(res.message);
  };

  const scanTick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          playNfcTapAudio();
          setScanResult(code.data);
          stopCameraScan();
          return;
        }
      }
    }
    scanAnimationId.current = requestAnimationFrame(scanTick);
  };

  const startCameraScan = async () => {
    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanAnimationId.current = requestAnimationFrame(scanTick);
      }
    } catch {
      setIsScanning(false);
      setCameraError('Camera unavailable. Please upload a QR image instead.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          playNfcTapAudio();
          setCameraError(null);
          setScanResult(code.data);
        } else {
          setCameraError('No valid QR code found in this image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const cleanPhoneForWhatsApp = rawPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhoneForWhatsApp}?text=${encodeURIComponent(
    `Hi ${selectedMember.name}, I connected via your digital business card!`
  )}`;

  const renderCardFrontFace = (withGlare = false) => (
    <div
      className={`relative w-full h-full rounded-2xl p-4 sm:p-6 flex flex-col justify-between overflow-hidden border ${currentSkinConfig.borderClass} shadow-2xl`}
      style={{ background: currentSkinConfig.frontBg }}
    >
      {withGlare && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-25"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.42) 0%, transparent 60%)`,
          }}
        />
      )}

      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ backgroundColor: currentSkinConfig.accentColor }}
      />
      <div
        className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-15"
        style={{ backgroundColor: currentSkinConfig.accentColor }}
      />

      {/* Top Row: Chip, Contactless & Credential */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-10 h-7 sm:w-11 sm:h-8 rounded-md bg-gradient-to-br ${currentSkinConfig.chipGradient} shadow-md border border-amber-500/40 flex flex-col justify-between p-1 shrink-0`}
          >
            <div className="w-full h-[1px] bg-black/35" />
            <div className="w-full flex justify-between">
              <div className="w-2.5 h-2.5 border border-black/35 rounded-xs" />
              <div className="w-2.5 h-2.5 border border-black/35 rounded-xs" />
            </div>
            <div className="w-full h-[1px] bg-black/35" />
          </div>
          <Wifi
            className="w-4 h-4 rotate-90 opacity-85"
            style={{ color: currentSkinConfig.accentColor }}
          />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowVerificationModal(true);
          }}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-md cursor-pointer hover:bg-white/15 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-white">
            {cardConfig.verifiedBadge || 'SQA'}
          </span>
        </button>
      </div>

      {/* Center Row: Avatar & Identity */}
      <div className="relative z-10 flex items-center space-x-3.5 sm:space-x-4 my-auto">
        <div className="relative shrink-0">
          <img
            src={
              !selectedMember.avatar || selectedMember.avatar === '/sabbir_avatar.jpeg'
                ? profile.avatar || '/sabbir_avatar.jpeg'
                : selectedMember.avatar
            }
            alt={displayedName}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-xl border-2"
            style={{ borderColor: currentSkinConfig.accentColor }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="overflow-hidden text-left">
          <h4 className="font-display font-extrabold text-white text-base sm:text-xl tracking-tight truncate">
            {displayedName}
          </h4>
          <p
            className="text-xs sm:text-sm font-semibold truncate mt-0.5"
            style={{ color: currentSkinConfig.accentColor }}
          >
            {displayedTitle}
          </p>
          <p className="text-[11px] text-slate-300/80 truncate mt-0.5">
            {userCompany} <span className="text-white/30">•</span> {displayedDepartment}
          </p>
        </div>
      </div>

      {/* Bottom Row: Essential Contact Details */}
      <div className="relative z-10 pt-2.5 border-t border-white/10 space-y-1">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-200 gap-2">
          <div className="flex items-center space-x-1.5 truncate">
            <Phone className="w-3 h-3 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
            <span className="truncate">{rawPhone}</span>
          </div>
          <div className="flex items-center space-x-1.5 truncate">
            <Mail className="w-3 h-3 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
            <span className="truncate">{rawEmail}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
          <span className="truncate flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
            {displayedLocation}
          </span>
          <span className="text-white/80 font-medium shrink-0">sabbir-sqa.vercel.app</span>
        </div>
      </div>
    </div>
  );

  const renderCardBackFace = (withGlare = false) => (
    <div
      className={`relative w-full h-full rounded-2xl flex flex-col justify-between overflow-hidden border ${currentSkinConfig.borderClass} shadow-2xl`}
      style={{ background: currentSkinConfig.backBg }}
    >
      {withGlare && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-20"
          style={{
            background: `radial-gradient(circle at ${100 - tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Executive Top Band */}
      <div className="w-full h-7 sm:h-8 bg-black/90 mt-2.5 border-y border-white/10 flex items-center px-4 justify-between">
        <span className="text-[8px] sm:text-[9px] font-mono text-white/70 tracking-widest uppercase truncate">
          {userCompany} • Software Quality Assurance
        </span>
        <Nfc className="w-3.5 h-3.5 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
      </div>

      {/* Center QR + Contact Highlights */}
      <div className="px-3.5 sm:px-5 py-2 flex items-center justify-between gap-3 sm:gap-4 my-auto">
        <div className="bg-white p-1.5 sm:p-2 rounded-xl shadow-lg shrink-0 flex flex-col items-center">
          {cardBackQrUrl || qrDataUrl ? (
            <img
              src={cardBackQrUrl || qrDataUrl}
              alt="Scan Digital Card"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-200 rounded-lg" />
          )}
          <span className="text-[8px] font-mono text-slate-900 font-bold tracking-wider uppercase mt-1">
            Scan Card
          </span>
        </div>

        <div className="flex-1 space-y-1.5 text-left overflow-hidden">
          <div className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 flex items-center space-x-2">
            <Building2
              className="w-3 h-3 shrink-0"
              style={{ color: currentSkinConfig.accentColor }}
            />
            <span className="text-[10px] sm:text-[11px] font-semibold text-white truncate">
              {userCompany}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 flex items-center space-x-2">
            <Phone className="w-3 h-3 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
            <span className="text-[9.5px] sm:text-[10.5px] font-mono text-slate-200 truncate">
              {rawPhone}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 flex items-center space-x-2">
            <Mail className="w-3 h-3 shrink-0" style={{ color: currentSkinConfig.accentColor }} />
            <span className="text-[9.5px] sm:text-[10.5px] font-mono text-slate-200 truncate">
              {rawEmail}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono hover:bg-emerald-500/25 transition-colors flex items-center space-x-1 truncate"
            >
              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </a>
            <a
              href="https://sabbir-sqa.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center space-x-1 truncate text-[9px] font-mono text-white transition-colors"
            >
              <Globe
                className="w-2.5 h-2.5 shrink-0"
                style={{ color: currentSkinConfig.accentColor }}
              />
              <span className="truncate">Portfolio</span>
            </a>
          </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <div className="px-4 pb-2.5 flex items-center justify-between text-[9px] font-mono text-slate-400">
        <span className="truncate">{displayedLocation}</span>
        <span style={{ color: currentSkinConfig.accentColor }}>sabbir-sqa.vercel.app</span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fadeIn"
      onClick={() => {
        stopCameraScan();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl bg-[#080C16] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] flex flex-col my-auto overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= TOP HEADER ================= */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${currentSkinConfig.accentColor}15`,
                borderColor: `${currentSkinConfig.accentColor}40`,
                color: currentSkinConfig.accentColor,
              }}
            >
              <Nfc className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-bold text-white text-base tracking-tight">
                  {displayedName}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(true)}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                  title="Verified Credentials"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{cardConfig.verifiedBadge || 'SQA'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {displayedTitle} • {userCompany}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraScan();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="flex items-center px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#080C16] gap-1.5 overflow-x-auto text-xs font-medium scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setActiveTab('card');
              stopCameraScan();
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'card'
                ? 'bg-[var(--color-accent)] text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Smart 3D Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[var(--color-accent)] text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan &amp; QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('nfc');
              stopCameraScan();
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'nfc'
                ? 'bg-[var(--color-accent)] text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Nfc className="w-3.5 h-3.5" />
            <span>NFC Touch</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('vcard');
              stopCameraScan();
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'vcard'
                ? 'bg-[var(--color-accent)] text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>vCard &amp; Info</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('print');
              stopCameraScan();
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'print'
                ? 'bg-[var(--color-accent)] text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* ----------------- TAB 1: SMART 3D CARD ----------------- */}
          {activeTab === 'card' && (
            <div className="space-y-5">
              {/* Minimal Controls: View Switcher, Card Finish Swatches & Flip */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setCardViewMode('flip')}
                    className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                      cardViewMode === 'flip'
                        ? 'bg-[var(--color-accent)] text-black font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>3D Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardViewMode('both')}
                    className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                      cardViewMode === 'both'
                        ? 'bg-[var(--color-accent)] text-black font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Front &amp; Back</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Subtle Finish Swatches */}
                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                    {CARD_SKINS.map((skin) => (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => setSelectedSkin(skin.id)}
                        title={skin.name}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${skin.swatchClass} ${
                          selectedSkin === skin.id
                            ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#080C16]'
                            : 'opacity-55 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>

                  {cardViewMode === 'flip' && (
                    <button
                      type="button"
                      onClick={() => setIsFlipped((prev) => !prev)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 text-[var(--color-accent)] transition-transform duration-500 ${
                          isFlipped ? 'rotate-180' : ''
                        }`}
                      />
                      <span>{isFlipped ? 'Show Front' : 'Flip Card'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3D Card Showcase */}
              {cardViewMode === 'flip' ? (
                <div className="flex flex-col items-center justify-center py-1 animate-fadeIn">
                  <div
                    ref={cardContainerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="relative w-full max-w-lg aspect-[1.586] cursor-pointer select-none"
                    style={{ perspective: '1200px' }}
                  >
                    <div
                      className="relative w-full h-full transition-transform duration-700 ease-out"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${tilt.rotateX}deg) rotateY(${
                          tilt.rotateY + (isFlipped ? 180 : 0)
                        }deg)`,
                      }}
                    >
                      {/* Front */}
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        {renderCardFrontFace(true)}
                      </div>

                      {/* Back */}
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          transform: 'rotateY(180deg)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        {renderCardBackFace(true)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full items-stretch animate-fadeIn">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-400 px-1 block">Front</span>
                    <div className="w-full aspect-[1.586]">{renderCardFrontFace(false)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-400 px-1 block">Back</span>
                    <div className="w-full aspect-[1.586]">{renderCardBackFace(false)}</div>
                  </div>
                </div>
              )}

              {/* Primary Visitor Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadVcf}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>{copied === 'vcf' ? 'Contact Saved' : 'Save Contact'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`tel:${rawPhone}`}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white border border-white/10 font-semibold text-xs transition-all"
                >
                  <Phone
                    className="w-4 h-4 shrink-0"
                    style={{ color: currentSkinConfig.accentColor }}
                  />
                  <span>Call Direct</span>
                </a>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white border border-white/10 font-semibold text-xs transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{copied === 'link' ? 'Link Copied' : 'Share Card'}</span>
                </button>
              </div>

              {/* Clean Social & Portfolio Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                <a
                  href="https://sabbir-sqa.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-white hover:text-[var(--color-accent)] font-medium transition-colors"
                >
                  <Globe className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>sabbir-sqa.vercel.app</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <div className="flex items-center space-x-4 text-slate-300">
                  <a
                    href={linkedinFullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 hover:text-white transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href={githubFullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 hover:text-white transition-colors"
                  >
                    <Github className="w-3.5 h-3.5 text-white" />
                    <span>GitHub</span>
                  </a>
                  <a
                    href={`mailto:${rawEmail}`}
                    className="inline-flex items-center space-x-1.5 hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 2: SCAN & QR ----------------- */}
          {activeTab === 'scan' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0B101D] border border-white/10 flex flex-col md:flex-row items-center gap-6 justify-between">
                {/* Crisp QR Card */}
                <div className="bg-white p-4 rounded-2xl shadow-2xl shrink-0 flex flex-col items-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Digital Business Card QR"
                      className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-200 rounded-xl" />
                  )}
                  <span className="text-[11px] font-semibold text-slate-900 mt-2">
                    {displayedName}
                  </span>
                </div>

                {/* Clean QR Channel Selector & Actions */}
                <div className="flex-1 space-y-4 text-left w-full">
                  <div>
                    <h4 className="font-display font-bold text-white text-lg">Scan to Connect</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Point any smartphone camera to connect instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(
                      [
                        { id: 'url', label: 'Digital Card' },
                        { id: 'vcard', label: 'Save Contact' },
                        { id: 'whatsapp', label: 'WhatsApp' },
                        { id: 'linkedin', label: 'LinkedIn' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setQrMode(item.id)}
                        className={`px-3.5 py-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                          qrMode === item.id
                            ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-white font-semibold'
                            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{item.label}</span>
                        {qrMode === item.id && (
                          <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      className="px-4 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>{copied === 'qr-png' ? 'Saved QR' : 'Save QR Image'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyValue(cardUrl, 'link')}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/10"
                    >
                      {copied === 'link' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copied === 'link' ? 'Link Copied' : 'Copy Card Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact QR Scanner Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-display font-semibold text-white text-sm">
                      QR Scanner
                    </span>
                  </div>

                  {!isScanning && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startCameraScan}
                        className="px-3.5 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Open Camera</span>
                      </button>

                      <label className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/10">
                        <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>Upload QR</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {isScanning && (
                  <div className="relative w-full max-w-md mx-auto aspect-video sm:aspect-square bg-black rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-[var(--color-accent)] rounded-2xl" />
                    </div>
                    <button
                      type="button"
                      onClick={stopCameraScan}
                      className="absolute bottom-4 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                    >
                      Close Camera
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {scanResult && (
                  <div className="p-4 rounded-xl bg-[#070B14] border border-[var(--color-accent)]/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Scanned Result</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setScanResult(null)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs font-mono text-slate-200 break-all bg-black/40 p-2.5 rounded-lg">
                      {scanResult}
                    </p>
                    <div className="flex items-center space-x-2">
                      {scanResult.startsWith('http') && (
                        <a
                          href={scanResult}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--color-accent)] text-black font-semibold text-xs"
                        >
                          Open Link
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyValue(scanResult, 'scanned')}
                        className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium cursor-pointer"
                      >
                        {copied === 'scanned' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------- TAB 3: NFC TOUCH ----------------- */}
          {activeTab === 'nfc' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="relative p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-[#0B101D] to-[#070A14] border border-white/10 overflow-hidden text-center">
                <div
                  className="absolute -top-16 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15"
                  style={{ backgroundColor: currentSkinConfig.accentColor }}
                />

                <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={handleSimulateNfcTap}
                    className={`relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-2xl ${
                      simulatedTapActive
                        ? 'bg-[var(--color-accent)] scale-105 shadow-[0_0_45px_rgba(0,210,255,0.45)]'
                        : 'bg-[#10172A] hover:bg-[#151F38] border-2 border-[var(--color-accent)]/45 hover:border-[var(--color-accent)]'
                    }`}
                  >
                    <div className="absolute -inset-3 rounded-full border border-[var(--color-accent)]/25 pointer-events-none" />
                    <div className="absolute -inset-6 rounded-full border border-[var(--color-accent)]/10 pointer-events-none" />

                    <div className="flex flex-col items-center">
                      <Nfc
                        className={`w-10 h-10 ${
                          simulatedTapActive ? 'text-black' : 'text-[var(--color-accent)]'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-mono font-bold uppercase mt-1 ${
                          simulatedTapActive ? 'text-black' : 'text-slate-300'
                        }`}
                      >
                        {simulatedTapActive ? 'Connected' : 'Tap'}
                      </span>
                    </div>
                  </button>

                  <h4 className="font-display font-bold text-white text-xl mt-6 tracking-tight">
                    {displayedName}
                  </h4>
                  <p className="text-xs text-[var(--color-accent)] font-medium mt-0.5">
                    {displayedTitle} • {userCompany}
                  </p>

                  {/* Clean Action Row */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full">
                    <button
                      type="button"
                      onClick={handleDownloadVcf}
                      className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{copied === 'vcf' ? 'Contact Saved' : 'Save Contact'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-xs flex items-center space-x-2 transition-all border border-white/10 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>{copied === 'link' ? 'Link Copied' : 'Share Card'}</span>
                    </button>

                    {hasWebNfc && (
                      <button
                        type="button"
                        onClick={handleWriteNfc}
                        disabled={nfcWriting}
                        className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-xs flex items-center space-x-2 transition-all border border-white/10 disabled:opacity-50 cursor-pointer"
                      >
                        <Nfc className="w-4 h-4 text-emerald-400" />
                        <span>{nfcWriting ? 'Ready to Tap...' : 'Sync NFC Card'}</span>
                      </button>
                    )}
                  </div>

                  {nfcStatus && (
                    <p className="text-xs text-slate-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl mt-4">
                      {nfcStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 4: VCARD & INFO ----------------- */}
          {activeTab === 'vcard' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Smart Executive Contact Profile */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0B101D] border border-white/10 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={selectedMember.avatar || '/sabbir_avatar.jpeg'}
                      alt={displayedName}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/20 shadow-lg shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h4 className="font-display font-bold text-white text-lg tracking-tight">
                        {displayedName}
                      </h4>
                      <p className="text-xs font-semibold text-[var(--color-accent)]">
                        {displayedTitle}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {userCompany} • {displayedDepartment}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleDownloadVcf}
                      className="px-4 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{copied === 'vcf' ? 'Saved' : 'Save Contact'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAllInfo}
                      className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors border border-white/10 cursor-pointer"
                    >
                      {copied === 'text' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied === 'text' ? 'Copied' : 'Copy Details'}</span>
                    </button>
                  </div>
                </div>

                {/* Smart Interactive Contact Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Phone */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-colors">
                    <a
                      href={`tel:${rawPhone}`}
                      className="flex items-center space-x-3 min-w-0 flex-1 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] text-slate-400 block">Phone &amp; WhatsApp</span>
                        <span className="text-white font-mono font-medium group-hover:text-[var(--color-accent)] transition-colors truncate block">
                          {rawPhone}
                        </span>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(rawPhone, 'phone')}
                      className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Copy Phone"
                    >
                      {copied === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Email */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-colors">
                    <a
                      href={`mailto:${rawEmail}`}
                      className="flex items-center space-x-3 min-w-0 flex-1 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] text-slate-400 block">Email</span>
                        <span className="text-white font-mono font-medium group-hover:text-emerald-400 transition-colors truncate block">
                          {rawEmail}
                        </span>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(rawEmail, 'email')}
                      className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Copy Email"
                    >
                      {copied === 'email' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Portfolio */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-colors">
                    <a
                      href="https://sabbir-sqa.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 min-w-0 flex-1 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] text-slate-400 block">Portfolio</span>
                        <span className="text-white font-mono font-medium group-hover:text-sky-400 transition-colors truncate block">
                          sabbir-sqa.vercel.app
                        </span>
                      </div>
                    </a>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
                  </div>

                  {/* Location */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-[11px] text-slate-400 block">Location</span>
                      <span className="text-white font-medium truncate block">
                        {displayedLocation}
                      </span>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <a
                    href={linkedinFullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                        <Linkedin className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] text-slate-400 block">LinkedIn</span>
                        <span className="text-white font-medium group-hover:text-blue-400 transition-colors truncate block">
                          {linkedinFullUrl.replace(/^https?:\/\/(www\.)?/, '')}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
                  </a>

                  {/* GitHub */}
                  <a
                    href={githubFullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                        <Github className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] text-slate-400 block">GitHub</span>
                        <span className="text-white font-medium group-hover:text-[var(--color-accent)] transition-colors truncate block">
                          {githubFullUrl.replace(/^https?:\/\/(www\.)?/, '')}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
                  </a>
                </div>
              </div>

              {/* Smart Executive Email Signature */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0B101D] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-white text-base">
                      Email Signature
                    </h4>
                    <p className="text-xs text-slate-400">
                      Ready to paste directly into Gmail, Outlook, or Apple Mail.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSignatureLightPreview((prev) => !prev)}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                      title={signatureLightPreview ? 'Dark Mail Preview' : 'Light Mail Preview'}
                    >
                      {signatureLightPreview ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySignatureHtml}
                      className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 font-medium text-xs flex items-center space-x-1.5 border border-white/10 transition-colors cursor-pointer"
                      title="Copy raw HTML code"
                    >
                      {copied === 'signature-html' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Code2 className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span>{copied === 'signature-html' ? 'HTML Copied' : 'HTML'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySignature}
                      className="px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      {copied === 'signature' ? (
                        <Check className="w-4 h-4 text-black" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copied === 'signature' ? 'Signature Copied' : 'Copy Signature'}</span>
                    </button>
                  </div>
                </div>

                {/* Live Executive Signature Card */}
                <div
                  className={`p-5 rounded-xl border transition-colors ${
                    signatureLightPreview
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#070B14] border-white/10 text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedMember.avatar || '/sabbir_avatar.jpeg'}
                      alt={displayedName}
                      className="w-13 h-13 rounded-xl object-cover shrink-0 shadow-sm border border-sky-500/30 hidden sm:block"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    <div className="border-l-[3px] border-sky-500 pl-3.5 space-y-1.5 min-w-0">
                      <div>
                        <div
                          className={`font-display font-bold text-base tracking-tight ${
                            signatureLightPreview ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {displayedName}
                        </div>
                        <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                          {displayedTitle}{' '}
                          <span
                            className={
                              signatureLightPreview ? 'text-slate-300' : 'text-slate-600'
                            }
                          >
                            •
                          </span>{' '}
                          <span
                            className={
                              signatureLightPreview ? 'text-slate-700' : 'text-slate-300'
                            }
                          >
                            {userCompany}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs ${
                          signatureLightPreview ? 'text-slate-600' : 'text-slate-300'
                        }`}
                      >
                        <a
                          href={`mailto:${rawEmail}`}
                          className="hover:text-sky-500 transition-colors font-medium"
                        >
                          {rawEmail}
                        </a>
                        <span className="opacity-30">|</span>
                        <a
                          href={`tel:${rawPhone}`}
                          className="hover:text-sky-500 transition-colors font-medium"
                        >
                          {rawPhone}
                        </a>
                        <span className="opacity-30">|</span>
                        <span>{displayedLocation}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs font-semibold text-sky-600">
                        <a
                          href="https://sabbir-sqa.vercel.app"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          Portfolio
                        </a>
                        <span className="opacity-40">•</span>
                        <a
                          href={linkedinFullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          LinkedIn
                        </a>
                        <span className="opacity-40">•</span>
                        <a
                          href={githubFullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          GitHub
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 5: PRINT ----------------- */}
          {activeTab === 'print' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Clean Print Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10">
                <div>
                  <h4 className="font-display font-bold text-white text-base">
                    Business Card Print Layout
                  </h4>
                  <p className="text-xs text-slate-400">
                    Front &amp; Back • Ready to Print or Save as PDF
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintCards}
                    className="px-4 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadFullPrintSheet}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors border border-white/10 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    <span>{copied === 'sheet-png' ? 'Sheet Saved' : 'Download Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Printable Front & Back Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-slate-400 font-medium">Front Side</span>
                    <button
                      type="button"
                      onClick={handleDownloadFrontPng}
                      className="text-[11px] font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      {copied === 'front-png' ? 'Saved PNG' : 'Download Front PNG'}
                    </button>
                  </div>

                  <div className="relative p-5 rounded-xl bg-gradient-to-br from-[#0B101D] to-[#060912] text-white shadow-xl border border-white/15 aspect-[1.75] flex flex-col justify-between text-left overflow-hidden">
                    <span className="absolute top-1.5 left-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute top-1.5 right-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-white/30">+</span>

                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-display font-bold text-base tracking-tight text-white">
                          {displayedName}
                        </h5>
                        <p className="text-[11px] font-semibold text-[var(--color-accent)]">
                          {displayedTitle}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        SQA
                      </span>
                    </div>

                    <div className="text-[10.5px] text-slate-200 space-y-0.5 font-mono">
                      <p>{rawPhone}</p>
                      <p>{rawEmail}</p>
                      <p className="text-slate-400">{displayedLocation}</p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                      <span>{userCompany}</span>
                      <span className="text-[var(--color-accent)]">sabbir-sqa.vercel.app</span>
                    </div>
                  </div>
                </div>

                {/* Back Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-slate-400 font-medium">Back Side</span>
                    <button
                      type="button"
                      onClick={handleDownloadBackPng}
                      className="text-[11px] font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      {copied === 'back-png' ? 'Saved PNG' : 'Download Back PNG'}
                    </button>
                  </div>

                  <div className="relative p-5 rounded-xl bg-[#070A14] text-white shadow-xl border border-white/15 aspect-[1.75] flex flex-col justify-between text-left overflow-hidden">
                    <span className="absolute top-1.5 left-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute top-1.5 right-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-white/30">+</span>
                    <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-white/30">+</span>

                    <div className="w-full h-5 bg-black/90 -mx-5 -mt-1 px-5 flex items-center">
                      <span className="text-[8px] font-mono text-white/60 tracking-widest uppercase">
                        {userCompany} • Software Quality Assurance
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 my-auto">
                      <div className="space-y-1 flex-1">
                        <div className="font-display font-bold text-sm text-white">
                          {displayedName}
                        </div>
                        <p className="text-[10.5px] text-[var(--color-accent)] font-medium">
                          {displayedTitle}
                        </p>
                        <p className="text-[10px] text-slate-400 pt-0.5">
                          Scan QR to save contact &amp; view portfolio.
                        </p>
                      </div>

                      {(cardBackQrUrl || qrDataUrl) && (
                        <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-md">
                          <img
                            src={cardBackQrUrl || qrDataUrl}
                            alt="Card QR"
                            className="w-16 h-16 sm:w-20 sm:h-20"
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-[9.5px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-white/10">
                      <span>{displayedDepartment}</span>
                      <span className="text-white/80">sabbir-sqa.vercel.app</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Print Sheet for @media print */}
              <div
                id="printable-visiting-card-sheet"
                className="hidden print-visiting-card-sheet text-black bg-white"
              >
                <div className="text-center mb-5 border-b border-slate-300 pb-3">
                  <h2 className="text-xl font-bold uppercase tracking-tight">
                    {selectedMember.name} — Business Card
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedMember.role} • {userCompany}
                  </p>
                </div>

                <div className="flex justify-center gap-8 flex-wrap mt-6">
                  {/* Front */}
                  <div className="w-[3.5in] h-[2in] border border-slate-400 rounded-lg p-3.5 flex flex-col justify-between bg-white text-black box-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[15px] font-bold">{selectedMember.name}</div>
                        <div className="text-[11px] text-sky-700 font-semibold">
                          {selectedMember.role}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 border border-emerald-600 rounded text-emerald-700">
                        SQA
                      </span>
                    </div>

                    <div className="text-[10px] font-mono leading-snug">
                      <div>{rawPhone}</div>
                      <div>{rawEmail}</div>
                      <div>{displayedLocation}</div>
                    </div>

                    <div className="flex justify-between text-[9px] border-t border-slate-200 pt-1 text-slate-600">
                      <span>{userCompany}</span>
                      <span>sabbir-sqa.vercel.app</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="w-[3.5in] h-[2in] border border-slate-400 rounded-lg p-3.5 flex items-center justify-between bg-white text-black box-border">
                    <div className="flex-1 pr-3">
                      <div className="text-[13px] font-bold">{selectedMember.name}</div>
                      <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                        {selectedMember.role}
                      </div>
                      <div className="text-[9px] text-slate-600 mt-2 leading-snug">
                        Scan QR to save contact &amp; view portfolio.
                      </div>
                      <div className="text-[8.5px] font-mono text-slate-500 mt-2">
                        sabbir-sqa.vercel.app
                      </div>
                    </div>

                    {(cardBackQrUrl || qrDataUrl) && (
                      <div className="p-1 border border-slate-200 rounded">
                        <img
                          src={cardBackQrUrl || qrDataUrl}
                          alt="Card QR"
                          className="w-[74px] h-[74px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/10 bg-[#0B101D] flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300 truncate">
            {displayedName} • {userCompany}
          </span>

          <button
            type="button"
            onClick={() => {
              stopCameraScan();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ================= VERIFIED CREDENTIAL MODAL ================= */}
      {showVerificationModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowVerificationModal(false)}
        >
          <div
            className="bg-[#0D1424] border border-emerald-500/35 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-display font-bold text-white text-base">
                  Verified Professional Profile
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-white/[0.04] space-y-1">
                <span className="text-white font-bold text-sm block">{selectedMember.name}</span>
                <span className="text-[var(--color-accent)] font-medium block">
                  {selectedMember.role}
                </span>
                <span className="text-slate-400 block">
                  {userCompany} • {displayedDepartment}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Core Specializations
                </span>
                <ul className="list-disc list-inside space-y-1 text-white/90">
                  <li>Manual &amp; Exploratory Testing (ERP &amp; Web)</li>
                  <li>Playwright &amp; Cypress UI Automation</li>
                  <li>Postman &amp; Newman REST API Validation</li>
                  <li>SQL Verification &amp; Agile Defect Lifecycle</li>
                </ul>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
