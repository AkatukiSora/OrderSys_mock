'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertColor, AppBar, Badge, Box, Button, Card, CardActions, CardContent, Chip, Container, Divider, IconButton, Snackbar, Stack, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';

const products = [
  { id: 'a1', name: '彩りフードボックス', description: 'イベント限定の軽食セット', price: 980, highlight: '人気No.1' },
  { id: 'b2', name: 'スパークリングドリンク', description: 'ノンアル・爽やかな炭酸', price: 480, highlight: '数量限定' },
  { id: 'c3', name: 'あったかスープ', description: '寒い屋外に嬉しい一杯', price: 420 },
  { id: 'd4', name: 'カラフルスイーツ', description: 'シェアしやすいミニデザート', price: 550 },
];

const currency = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
let orderCounter = 0;
const createMockOrderId = () => {
  orderCounter += 1;
  return `mock-${orderCounter}`;
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

export default function Home() {
  const [tab, setTab] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'pending' | 'canceled'>('idle');
  const [qrInvalidReason, setQrInvalidReason] = useState<'soldout' | 'cart-change' | null>(null);
  const [soldOutIds, setSoldOutIds] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const soldOutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const invalidateQr = (reason: 'soldout' | 'cart-change') => {
    if (soldOutTimerRef.current) {
      clearTimeout(soldOutTimerRef.current);
      soldOutTimerRef.current = null;
    }
    setOrderStatus('canceled');
    setQrValue(null);
    setQrInvalidReason(reason);
  };

  useEffect(() => {
    return () => {
      if (soldOutTimerRef.current) {
        clearTimeout(soldOutTimerRef.current);
      }
    };
  }, []);

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
        .filter(Boolean) as Array<{ id: string; name: string; description: string; price: number; quantity: number; subtotal: number; highlight?: string }>,
    [cart],
  );

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cartWithDetails.reduce((sum, item) => sum + item.subtotal, 0), [cartWithDetails]);

  const handleAdd = (id: string) => {
    if (soldOutIds.includes(id)) {
      setSnackbar({ open: true, message: '品切れの商品は追加できません', severity: 'warning' });
      return;
    }
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr('cart-change');
      setSnackbar({ open: true, message: 'カートを変更したためQRコードを無効化しました。', severity: 'info' });
    }
    setCart((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { id, quantity: 1 }];
    });
    setSnackbar({ open: true, message: 'カートに追加しました', severity: 'success' });
  };

  const handleDecrease = (id: string) => {
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr('cart-change');
      setSnackbar({ open: true, message: 'カートを変更したためQRコードを無効化しました。', severity: 'info' });
    }
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemove = (id: string) => {
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr('cart-change');
      setSnackbar({ open: true, message: 'カートを変更したためQRコードを無効化しました。', severity: 'info' });
    }
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    if (orderStatus === 'pending' && qrValue) {
      invalidateQr('cart-change');
      setSnackbar({ open: true, message: 'カートを変更したためQRコードを無効化しました。', severity: 'info' });
    }
    setCart([]);
    setOrderStatus('idle');
    setSoldOutIds([]);
  };

  const handleGenerateQr = () => {
    if (!cart.length) {
      setSnackbar({ open: true, message: 'カートが空です。商品を追加してください', severity: 'warning' });
      return;
    }

    if (soldOutTimerRef.current) {
      clearTimeout(soldOutTimerRef.current);
    }

    setSoldOutIds([]);
    setQrInvalidReason(null);

    const payload = {
      ver: 1,
      event: 'demo-event',
      order: createMockOrderId(),
      items: cart,
    };

    setQrValue(JSON.stringify(payload));
    setOrderStatus('pending');
    setSnackbar({ open: true, message: 'QRコードを生成しました。10秒後に品切れ通知が届きます。', severity: 'info' });

    soldOutTimerRef.current = setTimeout(() => {
      const candidates = cart.map((item) => item.id);
      if (!candidates.length) return;

      const randomCount = Math.max(1, Math.floor(Math.random() * candidates.length));
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, randomCount);

      setSoldOutIds((prev) => Array.from(new Set([...prev, ...picked])));
      invalidateQr('soldout');
      setSnackbar({ open: true, message: '一部商品が品切れになりました。注文は自動キャンセルされます。', severity: 'warning' });
    }, 10000);
  };

  const isSoldOut = (id: string) => soldOutIds.includes(id);

  const statusChip = () => {
    switch (orderStatus) {
      case 'pending':
        return <Chip size="small" color="secondary" label="QR発行済み" icon={<QrCode2Icon fontSize="small" />} />;
      case 'canceled':
        return (
          <Chip
            size="small"
            color="warning"
            label={qrInvalidReason === 'cart-change' ? '変更で無効化' : '品切れでキャンセル'}
          />
        );
      default:
        return <Chip size="small" color="default" label="ドラフト" />;
    }
  };

  return (
    <Box>
      <AppBar position="sticky" color="inherit" elevation={1} sx={{ backgroundColor: '#ffffff' }}>
        <Toolbar>
          <Stack direction="row" alignItems="center" spacing={1}>
            <RestaurantIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                イベント注文整理システム（モック）
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                事前注文でスムーズ受け取り
              </Typography>
            </Box>
          </Stack>
          <Box flexGrow={1} />
          {statusChip()}
        </Toolbar>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="画面タブ"
        >
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <RestaurantIcon fontSize="small" />
                <Typography variant="body2">メニュー</Typography>
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Badge color="primary" badgeContent={cartCount} max={9} overlap="circular">
                  <ShoppingCartIcon fontSize="small" />
                </Badge>
                <Typography variant="body2">カート</Typography>
              </Stack>
            }
          />
        </Tabs>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {tab === 0 && (
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  さっと選んで、QRで受け取り
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  バックエンドなしのデモですが、メニュー選択→カート→QR発行→品切れ通知までの流れを体験できます。
                </Typography>
              </CardContent>
            </Card>

            <Stack spacing={2}>
              {products.map((product) => (
                <Card key={product.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="flex-start" spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="h6">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {product.description}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {currency.format(product.price)}
                          </Typography>
                          {isSoldOut(product.id) && <Chip size="small" color="warning" label="品切れ" />}
                        </Stack>
                      </Box>
                      <Stack spacing={1} alignItems="flex-end">
                        {product.highlight && <Chip size="small" color="secondary" label={product.highlight} />}
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleAdd(product.id)}
                          disabled={isSoldOut(product.id)}
                        >
                          {isSoldOut(product.id) ? '品切れ中' : 'カートに追加'}
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">カート内容</Typography>
                    <Typography variant="body2" color="text.secondary">
                      合計 {cartCount} 点 / {currency.format(totalPrice)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" startIcon={<DeleteOutlineIcon />} onClick={handleClear} disabled={!cart.length}>
                      カートを空に
                    </Button>
                    <Chip label="10秒後に品切れ通知" size="small" color="secondary" variant="outlined" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {!!soldOutIds.length && (
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3 }}>
                品切れの商品があります。対象の商品をカートから削除してメニューを再選択してください。
              </Alert>
            )}

            {cartWithDetails.length ? (
              <Stack spacing={1.5}>
                {cartWithDetails.map((item) => (
                  <Card
                    key={item.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderColor: isSoldOut(item.id) ? 'warning.main' : undefined,
                      backgroundColor: isSoldOut(item.id) ? 'warning.50' : undefined,
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.description}
                            </Typography>
                          </Box>
                          <Stack spacing={1} alignItems="flex-end">
                            {isSoldOut(item.id) && <Chip size="small" color="warning" label="品切れ" />}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {currency.format(item.subtotal)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleDecrease(item.id)}
                              disabled={isSoldOut(item.id)}
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography variant="body1" minWidth={24} textAlign="center">
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleAdd(item.id)}
                              disabled={isSoldOut(item.id)}
                            >
                              <AddIcon />
                            </IconButton>
                          </Stack>
                          <Stack spacing={0.5} alignItems="flex-end">
                            {isSoldOut(item.id) && (
                              <Typography variant="caption" color="warning.main">
                                品切れです。削除してください。
                              </Typography>
                            )}
                            <Button
                              size="small"
                              color="inherit"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => handleRemove(item.id)}
                            >
                              削除
                            </Button>
                          </Stack>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="body1" gutterBottom>
                    カートは空です。
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    メニュータブから商品を追加して、QRコードを発行してください。
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">QRコードを生成</Typography>
                  <Typography variant="body2" color="text.secondary">
                    生成後 10 秒で「品切れになった」という想定でポップアップ通知が出ます。スタッフ提示用の簡易 QR です。
                  </Typography>
                </Stack>
              </CardContent>
              <Divider />
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  {qrInvalidReason ? (
                    <Stack spacing={1} alignItems="center">
                      <Chip label="QR無効" color="warning" />
                      <Typography variant="body2" color="warning.main" textAlign="center">
                        QRコードは無効になりました（{qrInvalidReason === 'soldout' ? '品切れ' : 'カート更新'}）。対象商品を削除し、再度生成してください。
                      </Typography>
                    </Stack>
                  ) : qrValue ? (
                    <Stack spacing={1} alignItems="center">
                      <Box p={2} sx={{ backgroundColor: '#ffffff', borderRadius: 2, boxShadow: 1 }}>
                        <QRCodeSVG value={qrValue} size={200} />
                      </Box>
                      <Chip label="発行済み" color="secondary" />
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        スタッフ提示用にこの画面を保持してください。
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      QRコードはまだありません。カートを確定して生成してください。
                    </Typography>
                  )}
                  <CardActions sx={{ width: '100%', pt: 0 }}>
                    <Button variant="contained" fullWidth startIcon={<QrCode2Icon />} onClick={handleGenerateQr}>
                      QRコードを生成
                    </Button>
                  </CardActions>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
