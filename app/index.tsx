import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useSpeedOverlay } from '@/hooks/useSpeedOverlay';

type Language = 'ar' | 'en';
type Theme = 'dark' | 'light';
type HistoryRow = { date: string; mobile: string; transfer: string; total: string };

const COPY = {
  ar: {
    title: 'مؤشر السرعة',
    live: 'قياس مباشر',
    down: 'تنزيل',
    up: 'رفع',
    mbps: 'ميجابت/ث',
    show: 'إظهار المؤشر',
    hide: 'إيقاف المؤشر',
    ready: 'المؤشر جاهز للظهور بجوار البطارية',
    permission: 'يحتاج صلاحية الظهور فوق التطبيقات',
    menu: 'التحكم',
    options: 'خيارات',
    reenable: 'إعادة تمكين',
    hideExit: 'إخفاء وخروج',
    usage: 'سجل الاستخدام',
    date: 'التاريخ',
    mobile: 'جوال',
    transfer: 'انتقال',
    total: 'المجموع',
    notice: 'تنويه',
    noticeText:
      'قد يظهر التطبيق استخدام بيانات غير صحيح إذا أُغلق التطبيق أو توقف. المطور غير مسؤول عن أي ضرر أو خسائر مادية.',
    settings: 'الإعدادات',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'الإنجليزية',
    theme: 'السمة',
    dark: 'داكنة',
    light: 'فاتحة',
    about: 'حول',
    version: 'الإصدار 1',
    email: 'Saleh.mabkhot@hotmail.com',
    developer: 'المطور',
    telegram: 'Telegram: @iSx3i',
    close: 'إغلاق',
    permissionHelp: 'اسمح للتطبيق بالظهور فوق التطبيقات ليبقى المؤشر بجوار البطارية.',
    enabled: 'تم تمكين المؤشر',
    disabled: 'تم إيقاف المؤشر',
    preview: 'وضع المعاينة',
  },
  en: {
    title: 'Speed indicator',
    live: 'LIVE MEASUREMENT',
    down: 'Download',
    up: 'Upload',
    mbps: 'Mbps',
    show: 'Show indicator',
    hide: 'Stop indicator',
    ready: 'Ready to appear beside the battery',
    permission: 'Overlay permission is required',
    menu: 'Controls',
    options: 'Options',
    reenable: 'Re-enable',
    hideExit: 'Hide & exit',
    usage: 'Usage history',
    date: 'Date',
    mobile: 'Mobile',
    transfer: 'Transfer',
    total: 'Total',
    notice: 'Notice',
    noticeText:
      'The app may show inaccurate data usage if it is closed or interrupted. The developer is not responsible for any damage or financial loss.',
    settings: 'Settings',
    language: 'Language',
    arabic: 'Arabic',
    english: 'English',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    about: 'About',
    version: 'Version 1',
    email: 'Saleh.mabkhot@hotmail.com',
    developer: 'Developer',
    telegram: 'Telegram: @iSx3i',
    close: 'Close',
    permissionHelp: 'Allow display over other apps to keep the indicator beside the battery.',
    enabled: 'Indicator enabled',
    disabled: 'Indicator stopped',
    preview: 'Preview mode',
  },
} as const;

const HISTORY: HistoryRow[] = [
  { date: '14/09/2026', mobile: '38 MB', transfer: '300 MB', total: '338 MB' },
  { date: '13/09/2026', mobile: '22 MB', transfer: '186 MB', total: '208 MB' },
  { date: '12/09/2026', mobile: '17 MB', transfer: '142 MB', total: '159 MB' },
];

function formatSpeed(kbps: number) {
  return (kbps / 1000).toFixed(1);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<Language>('ar');
  const [theme, setTheme] = useState<Theme>('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { enabled, permissionGranted, snapshot, enable, disable, nativeAvailable } =
    useSpeedOverlay();
  const t = COPY[language];
  const isArabic = language === 'ar';
  const palette = theme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    AsyncStorage.multiGet(['speed-language', 'speed-theme']).then((values) => {
      const storedLanguage = values[0][1];
      const storedTheme = values[1][1];
      if (storedLanguage === 'ar' || storedLanguage === 'en') setLanguage(storedLanguage);
      if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
    });
  }, []);

  const chooseLanguage = useCallback((next: Language) => {
    setLanguage(next);
    void AsyncStorage.setItem('speed-language', next);
    I18nManager.allowRTL(next === 'ar');
  }, []);

  const chooseTheme = useCallback((next: Theme) => {
    setTheme(next);
    void AsyncStorage.setItem('speed-theme', next);
  }, []);

  const toggleIndicator = useCallback(async () => {
    if (enabled) {
      await disable();
      Alert.alert(t.disabled);
      return;
    }
    const started = await enable();
    if (started) Alert.alert(t.enabled);
  }, [disable, enable, enabled, t.disabled, t.enabled]);

  const direction = isArabic ? 'rtl' : 'ltr';
  const statusLabel = enabled ? t.enabled : permissionGranted ? t.ready : t.permission;
  const buttonLabel = enabled ? t.hide : t.show;
  const meterColor = useMemo(
    () => (snapshot.downKbps > 4000 ? palette.primary : palette.accent),
    [palette.accent, palette.primary, snapshot.downKbps],
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { flexDirection: isArabic ? 'row' : 'row-reverse' }]}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.mutedForeground, textAlign: isArabic ? 'right' : 'left' }]}>
              {t.live}
            </Text>
            <Text style={[styles.title, { color: palette.foreground, textAlign: isArabic ? 'right' : 'left' }]}>
              {t.title}
            </Text>
          </View>
          <Pressable
            testID="control-menu"
            accessibilityLabel={t.menu}
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [
              styles.menuButton,
              { backgroundColor: palette.secondary, borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="sliders" size={20} color={palette.primary} />
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.livePill, { backgroundColor: `${meterColor}22` }]}>
            <View style={[styles.liveDot, { backgroundColor: meterColor }]} />
            <Text style={[styles.livePillText, { color: meterColor }]}>{enabled ? t.enabled : t.preview}</Text>
          </View>
          <Text style={[styles.speedValue, { color: palette.foreground }]}>
            {formatSpeed(snapshot.downKbps)}
            <Text style={[styles.speedUnit, { color: meterColor }]}> {t.mbps}</Text>
          </Text>
          <Text style={[styles.statusText, { color: palette.mutedForeground }]}>{statusLabel}</Text>
          <View style={[styles.meterTrack, { backgroundColor: palette.secondary }]}>
            <View
              style={[
                styles.meterFill,
                { backgroundColor: meterColor, width: `${Math.min(100, Math.max(14, snapshot.downKbps / 80))}%` },
              ]}
            />
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Feather name="arrow-down" size={17} color={palette.primary} />
              <Text style={[styles.metricLabel, { color: palette.mutedForeground }]}>{t.down}</Text>
              <Text style={[styles.metricValue, { color: palette.foreground }]}>
                {formatSpeed(snapshot.downKbps)} <Text style={styles.metricUnit}>{t.mbps}</Text>
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: palette.border }]} />
            <View style={styles.metric}>
              <Feather name="arrow-up" size={17} color={palette.accent} />
              <Text style={[styles.metricLabel, { color: palette.mutedForeground }]}>{t.up}</Text>
              <Text style={[styles.metricValue, { color: palette.foreground }]}>
                {formatSpeed(snapshot.upKbps)} <Text style={styles.metricUnit}>{t.mbps}</Text>
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          testID="indicator-toggle"
          onPress={() => void toggleIndicator()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.primary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Feather name={enabled ? 'eye-off' : 'eye'} size={20} color={palette.primaryForeground} />
          <Text style={[styles.primaryButtonText, { color: palette.primaryForeground }]}>{buttonLabel}</Text>
        </Pressable>

        {!nativeAvailable && (
          <View style={[styles.previewNote, { backgroundColor: palette.secondary }]}>
            <Feather name="smartphone" size={16} color={palette.accent} />
            <Text style={[styles.previewText, { color: palette.secondaryForeground }]}>{t.preview}</Text>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: palette.foreground }]}>{t.usage}</Text>
          <Text style={[styles.sectionMeta, { color: palette.mutedForeground }]}>3 {isArabic ? 'أيام' : 'days'}</Text>
        </View>
        <View style={[styles.tableCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: palette.border }]}>
            {[t.date, t.mobile, t.transfer, t.total].map((item) => (
              <Text key={item} style={[styles.tableHeaderText, { color: palette.mutedForeground }]}>{item}</Text>
            ))}
          </View>
          {HISTORY.map((row) => (
            <View key={row.date} style={[styles.tableRow, { borderBottomColor: palette.border }]}>
              <Text style={[styles.tableCell, styles.dateCell, { color: palette.secondaryForeground }]}>{row.date}</Text>
              <Text style={[styles.tableCell, { color: palette.secondaryForeground }]}>{row.mobile}</Text>
              <Text style={[styles.tableCell, { color: palette.secondaryForeground }]}>{row.transfer}</Text>
              <Text style={[styles.tableCell, styles.totalCell, { color: palette.primary }]}>{row.total}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.notice, { backgroundColor: `${palette.accent}12`, borderColor: `${palette.accent}42` }]}>
          <Feather name="info" size={17} color={palette.accent} />
          <View style={styles.noticeCopy}>
            <Text style={[styles.noticeTitle, { color: palette.accent }]}>{t.notice}</Text>
            <Text style={[styles.noticeText, { color: palette.secondaryForeground, textAlign: direction === 'rtl' ? 'right' : 'left' }]}>
              {t.noticeText}
            </Text>
          </View>
        </View>

        <View style={[styles.developer, { borderTopColor: palette.border }]}>
          <Text style={[styles.developerLabel, { color: palette.mutedForeground }]}>{t.developer}</Text>
          <Text style={[styles.developerName, { color: palette.foreground }]}>TSX31</Text>
          <Text style={[styles.developerContact, { color: palette.primary }]}>{t.telegram}</Text>
        </View>
      </ScrollView>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: palette.foreground }]}>{t.menu}</Text>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); setSettingsOpen(true); }}>
              <Feather name="settings" size={19} color={palette.primary} />
              <Text style={[styles.menuItemText, { color: palette.foreground }]}>{t.options}</Text>
              <Feather name={isArabic ? 'chevron-left' : 'chevron-right'} size={17} color={palette.mutedForeground} />
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); void enable(); }}>
              <Feather name="refresh-cw" size={19} color={palette.accent} />
              <Text style={[styles.menuItemText, { color: palette.foreground }]}>{t.reenable}</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); void disable(); }}>
              <Feather name="power" size={19} color={palette.destructive} />
              <Text style={[styles.menuItemText, { color: palette.foreground }]}>{t.hideExit}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.settingsSheet, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <Text style={[styles.sheetTitle, { color: palette.foreground }]}>{t.settings}</Text>
              <Pressable onPress={() => setSettingsOpen(false)}><Feather name="x" size={22} color={palette.mutedForeground} /></Pressable>
            </View>
            <Text style={[styles.settingLabel, { color: palette.mutedForeground }]}>{t.language}</Text>
            <View style={styles.choiceRow}>
              {([['ar', t.arabic], ['en', t.english]] as const).map(([value, label]) => (
                <Pressable key={value} onPress={() => chooseLanguage(value)} style={[styles.choice, { backgroundColor: language === value ? palette.primary : palette.secondary }]}>
                  <Text style={[styles.choiceText, { color: language === value ? palette.primaryForeground : palette.secondaryForeground }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.settingLabel, { color: palette.mutedForeground }]}>{t.theme}</Text>
            <View style={styles.choiceRow}>
              {([['dark', t.dark], ['light', t.light]] as const).map(([value, label]) => (
                <Pressable key={value} onPress={() => chooseTheme(value)} style={[styles.choice, { backgroundColor: theme === value ? palette.primary : palette.secondary }]}>
                  <Text style={[styles.choiceText, { color: theme === value ? palette.primaryForeground : palette.secondaryForeground }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.settingLabel, { color: palette.mutedForeground, marginTop: 22 }]}>{t.about}</Text>
            <Text style={[styles.aboutText, { color: palette.foreground }]}>{t.version}</Text>
            <Text style={[styles.aboutText, { color: palette.primary }]}>{t.email}</Text>
            <Text style={[styles.aboutText, { color: palette.primary }]}>{t.telegram}</Text>
            <Text style={[styles.permissionHelp, { color: palette.mutedForeground }]}>{t.permissionHelp}</Text>
            <Pressable style={[styles.closeButton, { backgroundColor: palette.secondary }]} onPress={() => setSettingsOpen(false)}>
              <Text style={[styles.closeButtonText, { color: palette.secondaryForeground }]}>{t.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  topBar: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 5 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  menuButton: { alignItems: 'center', borderRadius: 16, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  heroCard: { borderRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  livePill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { borderRadius: 5, height: 8, width: 8 },
  livePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  speedValue: { fontSize: 56, fontWeight: '700', letterSpacing: -2, marginTop: 16 },
  speedUnit: { fontSize: 17, fontWeight: '700', letterSpacing: 0 },
  statusText: { fontSize: 13, marginTop: 2 },
  meterTrack: { borderRadius: 6, height: 9, marginTop: 18, overflow: 'hidden' },
  meterFill: { borderRadius: 6, height: '100%' },
  metricRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around', marginTop: 22 },
  metric: { minWidth: 112 },
  metricDivider: { height: 36, width: 1 },
  metricLabel: { fontSize: 12, marginTop: 6 },
  metricValue: { fontSize: 16, fontWeight: '700', marginTop: 3 },
  metricUnit: { fontSize: 10, fontWeight: '500' },
  primaryButton: { alignItems: 'center', borderRadius: 17, flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14, minHeight: 56 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  previewNote: { alignItems: 'center', borderRadius: 13, flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 10, padding: 11 },
  previewText: { fontSize: 12, fontWeight: '600' },
  sectionHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 28 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  sectionMeta: { fontSize: 12 },
  tableCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  tableHeaderText: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14 },
  tableCell: { flex: 1, fontSize: 11, textAlign: 'center' },
  dateCell: { fontSize: 10 },
  totalCell: { fontWeight: '700' },
  notice: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 18, padding: 15 },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: 13, fontWeight: '700', marginBottom: 5 },
  noticeText: { fontSize: 12, lineHeight: 19 },
  developer: { borderTopWidth: 1, marginTop: 24, paddingTop: 18 },
  developerLabel: { fontSize: 11, marginBottom: 5 },
  developerName: { fontSize: 15, fontWeight: '700' },
  developerContact: { fontSize: 12, marginTop: 4 },
  modalBackdrop: { backgroundColor: '#02070DB8', flex: 1, justifyContent: 'flex-end' },
  menuSheet: { borderRadius: 26, borderWidth: 1, margin: 12, padding: 20 },
  settingsSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 22, paddingTop: 12 },
  sheetHandle: { alignSelf: 'center', backgroundColor: '#8FA8BF66', borderRadius: 3, height: 5, marginBottom: 16, width: 40 },
  sheetTitle: { fontSize: 21, fontWeight: '700' },
  menuItem: { alignItems: 'center', flexDirection: 'row', gap: 13, paddingVertical: 17 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600' },
  settingsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  settingLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  choice: { borderRadius: 13, flex: 1, padding: 13 },
  choiceText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  aboutText: { fontSize: 14, marginBottom: 7 },
  permissionHelp: { fontSize: 12, lineHeight: 18, marginTop: 18 },
  closeButton: { borderRadius: 14, marginTop: 20, padding: 15 },
  closeButtonText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});