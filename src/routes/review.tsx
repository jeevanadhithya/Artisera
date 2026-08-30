import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Pencil, Sparkles, Leaf, Shield, Grid3x3, Map, Mic, Square, Loader2, Languages, Check, IndianRupee, Tag, ArrowRight, Store } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { AiBadge, PageHeader, Chip } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/review')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search['productId'] as string) || '',
    };
  },
  component: Review,
});

function Review() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Artisan Price & Cost Inputs
  const [price, setPrice] = useState<string>('500');
  const [materialCost, setMaterialCost] = useState<string>('150');
  const [laborCost, setLaborCost] = useState<string>('200');

  // AI Generation State
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [craftType, setCraftType] = useState('');
  const [region, setRegion] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [keywords, setKeywords] = useState('');

  const fetchProductDetails = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await api.get<any>(`/products/${productId}`);
      setProduct(res);
      setTranscript(res.voice_transcript || '');
      
      if (res.price) setPrice(String(res.price));
      
      // Seed form fields
      setName(res.name || '');
      setCategory(res.category || '');
      setMaterial(res.material || '');
      setCraftType(res.craft_type || '');
      setRegion(res.region || '');
      setDescriptionEn(res.description_en || '');
      setDescriptionHi(res.description_hi || '');
      setKeywords(res.keywords ? (Array.isArray(res.keywords) ? res.keywords.join(', ') : res.keywords) : '');
    } catch (e) {
      console.error('Failed to load product:', e);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  // Voice recording handlers
  const recognitionRef = useRef<any>(null);
  const [liveText, setLiveText] = useState('');

  const getSupportedMimeType = (): { mimeType: string; ext: string } => {
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mimeType: 'audio/webm;codecs=opus', ext: 'webm' };
      if (MediaRecorder.isTypeSupported('audio/webm')) return { mimeType: 'audio/webm', ext: 'webm' };
      if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4', ext: 'm4a' };
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return { mimeType: 'audio/ogg', ext: 'ogg' };
    }
    return { mimeType: 'audio/webm', ext: 'webm' };
  };

  const startRecording = async () => {
    setLiveText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, ext } = getSupportedMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Start Web Speech API live recognition as instant fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'hi-IN';
          
          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + ' ';
            }
            if (current.trim()) {
              setLiveText(current.trim());
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (rErr) {
          console.warn('Live SpeechRecognition error:', rErr);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const cleanType = (mimeType ? mimeType.split(';')[0] : 'audio/webm') || 'audio/webm';
        const audioFile = new File([audioBlob], `voice.${ext}`, { type: cleanType });
        
        setTranscribing(true);
        try {
          const res = await api.uploadVoice<any>(productId, audioFile);
          toast.success('Voice description transcribed with Sarvam AI!');
          setTranscript(res.transcript);
          await fetchProductDetails();
        } catch (e: any) {
          console.error('Sarvam voice transcription error:', e);
          if (liveText.trim()) {
            toast.info('Using live voice transcript fallback.');
            setTranscript(liveText.trim());
            await api.put(`/products/${productId}`, { voice_transcript: liveText.trim() });
            await fetchProductDetails();
          } else {
            toast.error(e?.message || 'Failed to transcribe audio. You can also type details below.');
          }
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      toast.info('Recording... Describe your craft in Hindi, English, or any language.');
    } catch (err) {
      console.error('Failed to access microphone:', err);
      toast.error('Could not access microphone. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  // AI Catalog Generator Trigger
  const [generatingMessage, setGeneratingMessage] = useState('Understanding your craft...');
  
  const handleGenerateCatalog = async () => {
    setGenerating(true);
    setGeneratingMessage('Understanding your craft...');
    
    const messageRotation = setInterval(() => {
      setGeneratingMessage(prev => {
        if (prev.includes('Understanding')) return 'Creating your product description...';
        if (prev.includes('Creating')) return 'Preparing your marketplace listing...';
        return 'Understanding your craft...';
      });
    }, 1500);

    try {
      // Save price first
      const numericPrice = parseFloat(price) || 500;
      await api.put(`/products/${productId}`, {
        price: numericPrice,
        minimum_price: parseFloat(materialCost) || 150,
        maximum_price: numericPrice * 1.3
      });

      const res = await api.post<any>(`/products/${productId}/generate-catalog`);
      toast.success('AI catalog generated successfully!');
      await fetchProductDetails();
      setEditMode(false);
    } catch (e: any) {
      console.error('Catalog generation error:', e);
      toast.error(e?.message || 'AI catalog generation failed');
    } finally {
      clearInterval(messageRotation);
      setGenerating(false);
    }
  };

  // Save edits
  const handleSaveCatalog = async () => {
    try {
      const keywordsArray = keywords.split(',').map(s => s.trim()).filter(Boolean);
      await api.put(`/products/${productId}/catalog`, {
        name,
        category,
        material,
        craft_type: craftType,
        region,
        description_en: descriptionEn,
        description_hi: descriptionHi,
        keywords: keywordsArray,
        price: parseFloat(price) || 500,
      });
      toast.success('Listing details saved.');
      setEditMode(false);
      await fetchProductDetails();
    } catch (e) {
      toast.error('Failed to save changes');
    }
  };

  // Submit & Publish to Marketplace
  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (editMode) {
        await handleSaveCatalog();
      }
      
      await api.post(`/products/${productId}/publish`);
      toast.success('🎉 Product published live to Artisera Marketplace!');
      navigate({ to: '/profile' });
    } catch (e: any) {
      console.error('Failed to publish product:', e);
      toast.error(e?.message || 'Failed to publish product. Please check details.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  if (!product) {
    return (
      <PhoneFrame>
        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Product listing not found.</p>
          <Link to="/" className="btn-cta">Go Home</Link>
        </div>
      </PhoneFrame>
    );
  }

  const hasMediaForAI = product.image_url || transcript;
  const imageUrl = product.image_url || product.original_image_url || bambooFallback;
  const formattedPrice = price ? `₹${Number(price).toLocaleString('en-IN')}` : '₹500';

  return (
    <PhoneFrame>
      <div className="pb-8 space-y-4">
        <PageHeader title="Artisan Product Listing Studio" back="/add" />
        
        {/* Step Progress Bar */}
        <div className="px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground uppercase">
            <span className="text-success flex items-center gap-0.5">✓ Photo</span>
            <span className={transcript ? "text-success flex items-center gap-0.5" : "text-primary flex items-center gap-0.5"}>
              {transcript ? '✓ Voice/Text' : '● Voice/Text'}
            </span>
            <span className={price ? "text-success flex items-center gap-0.5" : "text-primary flex items-center gap-0.5"}>
              {price ? '✓ Price' : '● Price'}
            </span>
            <span className={product.ai_generated ? "text-success flex items-center gap-0.5" : "text-muted-foreground flex items-center gap-0.5"}>
              {product.ai_generated ? '✓ Preview' : '○ Preview'}
            </span>
            <span className="text-muted-foreground">○ Publish</span>
          </div>
          <div className="relative mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
              style={{ width: product.ai_generated ? '85%' : (price && transcript ? '60%' : '30%') }}
            />
          </div>
        </div>

        <div className="space-y-4 px-4">
          
          {/* STEP 1: Enhanced Product Image */}
          <div className="app-card overflow-hidden p-3 bg-card border border-border">
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={imageUrl}
                alt="Product preview"
                width={800}
                height={800}
                className="h-52 w-full object-cover"
              />
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-yellow-300 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5" /> {product.enhanced_image_url ? 'AI Studio Enhanced' : 'Product Photo'}
              </span>
            </div>
          </div>

          {/* STEP 2: Description Entry (Voice or Manual Typing) */}
          <div className="app-card p-4 space-y-3 bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">1. Description (Voice or Text)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[15rem]">
                  Speak in Hindi, English, or any language, or type your craft description below.
                </p>
              </div>
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive animate-pulse"
                >
                  <Square className="h-3.5 w-3.5 fill-destructive" /> Stop
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={transcribing}
                  className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Mic className="h-3.5 w-3.5" /> {transcript ? 'Re-record' : 'Record Voice'}
                </button>
              )}
            </div>

            {transcribing ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Transcribing voice description...
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Describe your craft (e.g. Handmade terracotta flower vase crafted in Madhubani style, 10 inches tall...)"
                  className="w-full rounded-xl bg-secondary p-3 text-xs border border-border/50 outline-none resize-none text-foreground"
                />
                {transcript && (
                  <div className="flex justify-end gap-2 text-[10px] font-extrabold text-success uppercase">
                    <span>✓ Description Ready</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: Artisan Pricing Entry */}
          <div className="app-card p-4 space-y-3 bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4 text-primary" /> 2. Set Selling Price & Costs
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Enter your target price and cost breakdown for AI catalog optimization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selling Price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs font-extrabold text-primary border border-border/50 outline-none"
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Cost</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs border border-border/50 outline-none"
                    placeholder="150"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Labor Cost</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs border border-border/50 outline-none"
                    placeholder="200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: AI Generator Action Trigger */}
          {!product.ai_generated && (
            <div className="rounded-2xl bg-gradient-to-br from-ai/15 via-card to-card p-4 border border-ai/30 space-y-3 text-center shadow-sm">
              <p className="text-xs font-semibold text-foreground">
                {generating ? generatingMessage : 'Photo, description, and price captured. Generate your full marketplace catalog page with AI.'}
              </p>
              <button
                onClick={handleGenerateCatalog}
                disabled={generating || !hasMediaForAI}
                className="btn-cta w-full py-3.5 flex items-center justify-center gap-2 font-bold shadow-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {generatingMessage}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-yellow-300" /> Generate Product Catalog Page
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 5: Full Product Page Preview & Review */}
          {product.ai_generated && (
            <div className="app-card space-y-4 p-4 border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <AiBadge>Marketplace Page Preview</AiBadge>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">Review your product listing before publishing</p>
                </div>
                {editMode ? (
                  <button
                    onClick={handleSaveCatalog}
                    className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/20"
                  >
                    <Check className="h-3.5 w-3.5" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground hover:bg-secondary-foreground/10"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Page
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Product Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs font-bold border border-border/40 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Price (₹)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs font-bold border border-border/40 outline-none text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Material</label>
                      <input
                        type="text"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Craft Type</label>
                      <input
                        type="text"
                        value={craftType}
                        onChange={(e) => setCraftType(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description (English)</label>
                    <textarea
                      rows={3}
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description (Hindi)</label>
                    <textarea
                      rows={3}
                      value={descriptionHi}
                      onChange={(e) => setDescriptionHi(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title & Price Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">{product.name}</h2>
                      <span className="inline-block mt-1 text-xs font-bold text-success">In Stock • Ready to Order</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">{formattedPrice}</span>
                      <p className="text-[10px] text-muted-foreground">Includes taxes</p>
                    </div>
                  </div>

                  {/* Specification Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Category', value: product.category, icon: Leaf },
                      { label: 'Material', value: product.material, icon: Shield },
                      { label: 'Craft Type', value: product.craft_type, icon: Grid3x3 },
                      { label: 'Region', value: product.region, icon: Map },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl bg-secondary/70 p-2.5 border border-border/30">
                        <p className="text-[9px] uppercase font-extrabold tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold truncate">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> {value || '--'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Marketplace Descriptions */}
                  <div className="space-y-2 text-left">
                    <div className="rounded-xl bg-secondary/40 p-3 border border-border/30">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">English Description</p>
                      <p className="text-xs leading-relaxed text-foreground">{product.description_en || 'Handcrafted item created by artisan.'}</p>
                    </div>

                    <div className="rounded-xl bg-secondary/40 p-3 border border-border/30">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                        <Languages className="h-3 w-3 text-ai" /> Hindi Description / विवरण
                      </p>
                      <p className="text-xs leading-relaxed text-foreground">{product.description_hi || 'प्रामाणिक हस्तशिल्प उत्पाद।'}</p>
                    </div>
                  </div>

                  {product.keywords && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(Array.isArray(product.keywords) ? product.keywords : String(product.keywords).split(',')).map((kw: string) => (
                        <Chip key={kw}>{kw.trim()}</Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Final Action Buttons */}
          {product.ai_generated && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-cta w-full py-4 flex items-center justify-center gap-2 font-black text-base shadow-lg hover:scale-[1.01] transition-all"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Publishing to Marketplace...
                  </>
                ) : (
                  <>
                    <Store className="h-5 w-5" /> Submit & Publish Product to Marketplace
                  </>
                )}
              </button>
              
              <button
                onClick={handleGenerateCatalog}
                disabled={generating}
                className="w-full py-3 bg-secondary text-muted-foreground hover:text-foreground rounded-2xl text-xs font-bold border border-border/40 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Re-generate Catalog Details with AI
              </button>
            </div>
          )}

        </div>
      </div>
    </PhoneFrame>
  );
}
