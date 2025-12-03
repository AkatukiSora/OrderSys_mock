'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertColor,
  AppBar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';

// ============================================
// 型定義
// ============================================

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  highlight?: string;
};

type CartItem = {
  id: string;
  quantity: number;
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor;
};

// ============================================
// ハードコードデータ
// ============================================

const categories: Category[] = [
  { id: 'tshirt', name: 'Tシャツ', icon: '👕' },
  { id: 'accessory', name: 'アクキー/トートバッグ', icon: '🎒' },
];

const products: Product[] = [
  // Tシャツカテゴリ
  {
    id: 't1',
    name: 'うにTシャツ',
    description: '人気のうにデザイン。フリーサイズ。',
    price: 3500,
    category: 'tshirt',
    image: 'https://placehold.jp/4CAF50/FFFFFF/150x150.png?text=うに',
    highlight: '人気No.1',
  },
  {
    id: 't2',
    name: 'ショコラTシャツ',
    description: 'チョコレートカラーの落ち着いたデザイン。',
    price: 3000,
    category: 'tshirt',
    image: 'https://placehold.jp/8B4513/FFFFFF/150x150.png?text=ショコラ',
  },
  {
    id: 't3',
    name: '抹茶Tシャツ',
    description: '和風テイストの抹茶グリーン。',
    price: 3000,
    category: 'tshirt',
    image: 'https://placehold.jp/228B22/FFFFFF/150x150.png?text=抹茶',
    highlight: '新作',
  },
  {
    id: 't4',
    name: 'いちごTシャツ',
    description: 'ポップないちご柄。',
    price: 3200,
    category: 'tshirt',
    image: 'https://placehold.jp/FF69B4/FFFFFF/150x150.png?text=いちご',
  },
  // アクキー/トートバッグカテゴリ
  {
    id: 'a1',
    name: 'うにアクリルキーホルダー',
    description: 'かわいいうにのアクキー。',
    price: 800,
    category: 'accessory',
    image: 'https://placehold.jp/FFD700/000000/150x150.png?text=アクキー',
    highlight: '数量限定',
  },
  {
    id: 'a2',
    name: 'ショコラトートバッグ',
    description: '普段使いにぴったりのトート。',
    price: 2500,
    category: 'accessory',
    image: 'https://placehold.jp/D2691E/FFFFFF/150x150.png?text=トート',
  },
  {
    id: 'a3',
    name: '抹茶缶バッジセット',
    description: '3個セットの缶バッジ。',
    price: 500,
    category: 'accessory',
    image: 'https://placehold.jp/006400/FFFFFF/150x150.png?text=缶バッジ',
  },
  {
    id: 'a4',
    name: 'いちごポーチ',
    description: '小物入れに便利なポーチ。',
    price: 1500,
    category: 'accessory',
    image: 'https://placehold.jp/FF1493/FFFFFF/150x150.png?text=ポーチ',
  },
];

// ============================================
// ユーティリティ
// ============================================

const currency = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

// UUIDを生成してバイナリをbase64エンコード
const generateUuidBase64 = (): string => {
  // crypto.randomUUID()でUUID v4を生成
  const uuid = crypto.randomUUID();
  // ハイフンを除去して16進数文字列を取得
  const hex = uuid.replace(/-/g, '');
  // 16進数文字列をバイナリ配列に変換
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  // バイナリをbase64エンコード
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// ============================================
// メインコンポーネント
// ============================================

export default function Home() {
  // 状態管理
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmedCart, setConfirmedCart] = useState<CartItem[]>([]); // QR生成時のカート状態を保持
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'qr'>('menu'); // 画面状態
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'pending' | 'canceled'>('idle');
  const [soldOutIds, setSoldOutIds] = useState<string[]>([]);
  const [soldOutPopup, setSoldOutPopup] = useState<{ open: boolean; productNames: string[] }>({ open: false, productNames: [] });
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const [detailQuantity, setDetailQuantity] = useState(1);
  const soldOutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // QR無効化
  const invalidateQr = () => {
    if (soldOutTimerRef.current) {
      clearTimeout(soldOutTimerRef.current);
      soldOutTimerRef.current = null;
    }
    setOrderStatus('canceled');
    setQrValue(null);
  };

  // 選び直す（QR無効化してメニューに戻る）
  const handleBackToMenu = () => {
    // QRを無効化
    invalidateQr();
    // メニュー画面に戻る
    setCurrentView('menu');
    setConfirmedCart([]);
    setSnackbar({ open: true, message: 'QRコードを無効化しました。商品を選び直してください。', severity: 'info' });
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (soldOutTimerRef.current) {
        clearTimeout(soldOutTimerRef.current);
      }
    };
  }, []);

  // カート詳細計算
  const cartWithDetails = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((p) => p.id === item.id);
          if (!product) return null;
          return {
            ...product,
            quantity: item.quantity,
            subtotal: product.price * item.quantity,
          };
        })
        .filter(Boolean) as Array<Product & { quantity: number; subtotal: number }>,
    [cart],
  );

  // 確定時のカート詳細（QR画面用）
  const confirmedCartWithDetails = useMemo(
    () =>
      confirmedCart
        .map((item) => {
          const product = products.find((p) => p.id === item.id);
          if (!product) return null;
          return {
            ...product,
            quantity: item.quantity,
            subtotal: product.price * item.quantity,
          };
        })
        .filter(Boolean) as Array<Product & { quantity: number; subtotal: number }>,
    [confirmedCart],
  );

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cartWithDetails.reduce((sum, item) => sum + item.subtotal, 0), [cartWithDetails]);
  const confirmedTotalPrice = useMemo(() => confirmedCartWithDetails.reduce((sum, item) => sum + item.subtotal, 0), [confirmedCartWithDetails]);

  // フィルタリングされた商品
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // カート操作
  const handleAddToCart = (id: string, quantity: number = 1) => {
    if (soldOutIds.includes(id)) {
      setSnackbar({ open: true, message: '品切れの商品は追加できません', severity: 'warning' });
      return;
    }
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr();
      setSnackbar({ open: true, message: 'カートを変更したためQRコードを無効化しました', severity: 'info' });
    }
    setCart((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...prev, { id, quantity }];
    });
    setSnackbar({ open: true, message: 'カートに追加しました', severity: 'success' });
  };

  const handleRemove = (id: string) => {
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr();
    }
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr();
    }
    setCart([]);
    setOrderStatus('idle');
    setQrValue(null);
    setSoldOutIds([]);
  };

  // QRコード生成
  const handleGenerateQr = () => {
    if (!cart.length) {
      setSnackbar({ open: true, message: 'カートが空です', severity: 'warning' });
      return;
    }

    if (soldOutTimerRef.current) {
      clearTimeout(soldOutTimerRef.current);
    }

    // 確定時のカート状態を保存
    setConfirmedCart([...cart]);

    // UUIDのバイナリをbase64エンコードしたものをQRコードに表示
    const qrData = generateUuidBase64();

    setQrValue(qrData);
    setOrderStatus('pending');
    setShowCart(false);
    setCurrentView('qr'); // QR画面に遷移
    setSnackbar({ open: true, message: 'QRコードを生成しました', severity: 'success' });

    // 10秒後に品切れシミュレーション
    soldOutTimerRef.current = setTimeout(() => {
      const cartIds = cart.map((item) => item.id);
      if (!cartIds.length) return;

      // ランダムで1〜2商品を品切れに
      const shuffled = [...cartIds].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.max(1, Math.floor(Math.random() * 2) + 1));

      // 品切れ商品名を取得
      const soldOutNames = picked
        .map((id) => products.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[];

      setSoldOutIds((prev) => Array.from(new Set([...prev, ...picked])));

      // カートから品切れ商品を削除
      setCart((prev) => prev.filter((item) => !picked.includes(item.id)));
      setConfirmedCart((prev) => prev.filter((item) => !picked.includes(item.id)));

      // QR無効化
      setOrderStatus('canceled');
      setQrValue(null);

      // ポップアップ表示
      setSoldOutPopup({ open: true, productNames: soldOutNames });
    }, 10000);
  };

  // 商品タップ時
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailQuantity(1);
  };

  // 詳細モーダルからカートに追加
  const handleAddFromDetail = () => {
    if (selectedProduct) {
      handleAddToCart(selectedProduct.id, detailQuantity);
      setSelectedProduct(null);
    }
  };

  const isSoldOut = (id: string) => soldOutIds.includes(id);

  // ============================================
  // QR確定後画面
  // ============================================
  if (currentView === 'qr') {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {/* スマホ幅に制限するラッパー */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 430,
            height: '100dvh',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: { xs: 'none', sm: '0 0 20px rgba(0,0,0,0.1)' },
            overflow: 'hidden',
          }}
        >
          {/* ヘッダー */}
          <AppBar position="static" sx={{ backgroundColor: '#2E7D32', flexShrink: 0 }}>
            <Toolbar sx={{ minHeight: 56 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                夕時茶屋 おしながき
              </Typography>
            </Toolbar>
          </AppBar>

          {/* QRコード表示エリア */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* QRコード（中央大きく表示） */}
            <Box
              sx={{
                flexShrink: 0,
                height: '40%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#E8F5E9',
              }}
            >
              {qrValue ? (
                <Box sx={{ backgroundColor: '#ffffff', p: 1.5, borderRadius: 2, boxShadow: 2 }}>
                  <QRCodeSVG value={qrValue} size={160} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 160,
                    height: 160,
                    backgroundColor: '#ffebee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Typography color="error" fontWeight="bold">
                    QR無効
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 合計金額 */}
            <Box
              sx={{
                flexShrink: 0,
                py: 2,
                px: 3,
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #E0E0E0',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">合計</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {currency.format(confirmedTotalPrice)}
                </Typography>
              </Stack>
            </Box>

            {/* 注文一覧（縦スクロール可能） + 選び直すボタン */}
            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              {/* 注文一覧 */}
              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  p: 2,
                  backgroundColor: '#FAFAFA',
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  注文内容
                </Typography>
                <Stack spacing={1}>
                  {confirmedCartWithDetails.map((item) => (
                    <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {currency.format(item.price)} × {item.quantity}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {currency.format(item.subtotal)}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
                {qrValue && (
                  <Chip
                    label="10秒後に品切れ通知が届きます（デモ）"
                    size="small"
                    color="warning"
                    sx={{ mt: 2 }}
                  />
                )}
              </Box>

              {/* 選び直すボタン（縦長、右側） */}
              <Box
                onClick={handleBackToMenu}
                sx={{
                  width: 60,
                  flexShrink: 0,
                  backgroundColor: '#E8F5E9',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderLeft: '1px solid #C8E6C9',
                  '&:hover': { backgroundColor: '#C8E6C9' },
                  '&:active': { backgroundColor: '#A5D6A7' },
                }}
              >
                <Typography
                  sx={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontWeight: 'bold',
                    color: '#2E7D32',
                    letterSpacing: 4,
                  }}
                >
                  選び直す
                </Typography>
                <Typography
                  sx={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontSize: 10,
                    color: 'text.secondary',
                    mt: 1,
                  }}
                >
                  メニューへ戻る
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 品切れポップアップ */}
          <Dialog open={soldOutPopup.open} onClose={() => setSoldOutPopup({ open: false, productNames: [] })}>
            <DialogTitle sx={{ color: 'error.main' }}>⚠️ 品切れのお知らせ</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>以下の商品が品切れになりました：</Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {soldOutPopup.productNames.map((name, idx) => (
                  <Typography component="li" key={idx} fontWeight="bold">
                    {name}
                  </Typography>
                ))}
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                該当商品はカートから削除され、QRコードは無効になりました。
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                onClick={() => {
                  setSoldOutPopup({ open: false, productNames: [] });
                  handleBackToMenu();
                }}
                fullWidth
              >
                メニューに戻る
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert
              severity={snackbar.severity}
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              variant="filled"
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    );
  }

  // ============================================
  // メニュー画面
  // ============================================
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* スマホ幅に制限するラッパー */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 430,
          height: '100dvh',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: { xs: 'none', sm: '0 0 20px rgba(0,0,0,0.1)' },
          overflow: 'hidden',
          position: 'relative',
        }}
      >
      {/* ヘッダー（上部固定） */}
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: '#2E7D32', 
          width: '100%',
          maxWidth: 430,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            夕時茶屋 おしながき
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ヘッダーの高さ分のスペーサー */}
      <Box sx={{ height: 56, flexShrink: 0 }} />

      {/* メインコンテンツ */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', pb: '72px' }}>
        {/* カテゴリサイドバー */}
        <Box
          sx={{
            width: 70,
            flexShrink: 0,
            backgroundColor: '#E8F5E9',
            borderRight: '1px solid #C8E6C9',
            overflowY: 'auto',
          }}
        >
          <Stack spacing={0}>
            {/* 全商品ボタン */}
            <Box
              onClick={() => setSelectedCategory(null)}
              sx={{
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: selectedCategory === null ? '#C8E6C9' : 'transparent',
                borderLeft: selectedCategory === null ? '3px solid #2E7D32' : '3px solid transparent',
                '&:hover': { backgroundColor: '#C8E6C9' },
              }}
            >
              <Typography sx={{ fontSize: 20 }}>🏠</Typography>
              <Typography variant="caption" sx={{ fontSize: 10, display: 'block', lineHeight: 1.2 }}>
                全商品
              </Typography>
            </Box>
            {categories.map((cat) => (
              <Box
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat.id ? '#C8E6C9' : 'transparent',
                  borderLeft: selectedCategory === cat.id ? '3px solid #2E7D32' : '3px solid transparent',
                  '&:hover': { backgroundColor: '#C8E6C9' },
                }}
              >
                <Typography sx={{ fontSize: 20 }}>{cat.icon}</Typography>
                <Typography variant="caption" sx={{ fontSize: 10, display: 'block', lineHeight: 1.2 }}>
                  {cat.name}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* 商品グリッド */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, backgroundColor: '#FAFAFA' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
            }}
          >
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                onClick={() => !isSoldOut(product.id) && handleProductClick(product)}
                sx={{
                  cursor: isSoldOut(product.id) ? 'not-allowed' : 'pointer',
                  opacity: isSoldOut(product.id) ? 0.5 : 1,
                  filter: isSoldOut(product.id) ? 'grayscale(100%)' : 'none',
                  borderRadius: 2,
                  position: 'relative',
                  '&:hover': {
                    boxShadow: isSoldOut(product.id) ? 1 : 4,
                  },
                }}
              >
                {product.highlight && !isSoldOut(product.id) && (
                  <Chip
                    label={product.highlight}
                    size="small"
                    color="secondary"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      fontSize: 11,
                      height: 24,
                      fontWeight: 'bold',
                    }}
                  />
                )}
                {isSoldOut(product.id) && (
                  <Chip
                    label="品切れ"
                    size="small"
                    color="error"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      fontSize: 11,
                      height: 24,
                      fontWeight: 'bold',
                    }}
                  />
                )}
                <Box
                  component="img"
                  src={product.image}
                  alt={product.name}
                  sx={{
                    width: '100%',
                    aspectRatio: '1',
                    objectFit: 'cover',
                  }}
                />
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: 14,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {product.name}
                  </Typography>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: 16, mt: 0.5 }}>
                    {currency.format(product.price)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>

      {/* フッター（下部固定） */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #E0E0E0',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
          zIndex: 1000,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" onClick={() => setShowCart(true)} sx={{ cursor: 'pointer' }}>
          <Badge badgeContent={cartCount} color="primary">
            <ShoppingCartIcon color="action" />
          </Badge>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {cartCount}点
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {currency.format(totalPrice)}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          color="primary"
          startIcon={<QrCode2Icon />}
          onClick={handleGenerateQr}
          disabled={cartCount === 0}
          sx={{ minWidth: 140, height: 44 }}
        >
          確定 / QR生成
        </Button>
      </Box>

      {/* 商品詳細モーダル */}
      <Dialog
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedProduct && (
          <>
            <DialogTitle 
              component="div"
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h6" component="span" fontWeight="bold">
                {selectedProduct.name}
              </Typography>
              <IconButton onClick={() => setSelectedProduct(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box
                component="img"
                src={selectedProduct.image}
                alt={selectedProduct.name}
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 2,
                }}
              />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {selectedProduct.description}
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 2 }}>
                {currency.format(selectedProduct.price)}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
                <IconButton
                  onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                  sx={{ border: '1px solid #E0E0E0' }}
                >
                  <RemoveIcon />
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                  {detailQuantity}
                </Typography>
                <IconButton
                  onClick={() => setDetailQuantity((q) => q + 1)}
                  sx={{ border: '1px solid #E0E0E0' }}
                >
                  <AddIcon />
                </IconButton>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleAddFromDetail}
                disabled={isSoldOut(selectedProduct.id)}
                sx={{ height: 48 }}
              >
                カートへ追加 ({currency.format(selectedProduct.price * detailQuantity)})
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* カートドロワー */}
      <Drawer anchor="bottom" open={showCart} onClose={() => setShowCart(false)}>
        <Box sx={{ maxHeight: '70vh', p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              カート内容
            </Typography>
            <IconButton onClick={() => setShowCart(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {cartWithDetails.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              カートは空です
            </Typography>
          ) : (
            <>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {cartWithDetails.map((item) => (
                  <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {currency.format(item.price)} × {item.quantity}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight="bold">
                            {currency.format(item.subtotal)}
                          </Typography>
                          <IconButton size="small" onClick={() => handleRemove(item.id)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              <Box sx={{ borderTop: '1px solid #E0E0E0', pt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">合計</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {currency.format(totalPrice)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleClearCart}
                    startIcon={<DeleteOutlineIcon />}
                    sx={{ flex: 1 }}
                  >
                    クリア
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleGenerateQr}
                    startIcon={<QrCode2Icon />}
                    sx={{ flex: 2 }}
                  >
                    確定 / QR生成
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* 品切れポップアップ */}
      <Dialog open={soldOutPopup.open} onClose={() => setSoldOutPopup({ open: false, productNames: [] })}>
        <DialogTitle sx={{ color: 'error.main' }}>⚠️ 品切れのお知らせ</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>以下の商品が品切れになりました：</Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            {soldOutPopup.productNames.map((name, idx) => (
              <Typography component="li" key={idx} fontWeight="bold">
                {name}
              </Typography>
            ))}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            該当商品はカートから削除され、QRコードは無効になりました。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setSoldOutPopup({ open: false, productNames: [] })}
            fullWidth
          >
            確認しました
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
}
