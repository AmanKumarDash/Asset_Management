import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Brand Colors (from Deeptech Genie logo) ───────────────────
const COLORS = {
  bgWhite:       '#FFFFFF',
  gradientStart: '#FFFFFF',
  gradientMid1:  '#EEF3FF',
  gradientMid2:  '#E8F0FE',
  gradientEnd:   '#FFF8E7',
  navyDark:      '#1A3A8F',
  navyMid:       '#1A56DB',
  gold:          '#F5A623',
  taglineText:   '#6A82A8',
  dotBlue:       '#1A56DB',
  ringBlue:      '#1A56DB',
  ringGold:      '#F5A623',
};

const { height } = Dimensions.get('window');

type Props = {
  onFinish: () => void;
};

export default function BrandSplashScreen({ onFinish }: Props) {

  // ── Animation refs ────────────────────────────────────────────
  const ring1Scale   = useRef(new Animated.Value(0.3)).current;
  const ring1Opacity = useRef(new Animated.Value(0.8)).current;
  const ring2Scale   = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;

  const logoScale    = useRef(new Animated.Value(0.2)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoTransY   = useRef(new Animated.Value(20)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTransY  = useRef(new Animated.Value(14)).current;

  const dot1Opacity  = useRef(new Animated.Value(0.25)).current;
  const dot2Opacity  = useRef(new Animated.Value(0.25)).current;
  const dot3Opacity  = useRef(new Animated.Value(0.25)).current;
  const dot1Scale    = useRef(new Animated.Value(0.7)).current;
  const dot2Scale    = useRef(new Animated.Value(0.7)).current;
  const dot3Scale    = useRef(new Animated.Value(0.7)).current;

  const shimmerTransX = useRef(new Animated.Value(-80)).current;

  const screenOpacity = useRef(new Animated.Value(1)).current;

  // ── Dot bounce helper ─────────────────────────────────────────
  const bounceDot = (opacity: Animated.Value, scale: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1,    duration: 280, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1.25, duration: 280, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 0.7,  duration: 280, useNativeDriver: true }),
        ]),
        Animated.delay(560 - delay),
      ])
    );

  useEffect(() => {
    // ── 1. Ring pulses (0ms) ──────────────────────────────────
    Animated.parallel([
      Animated.timing(ring1Scale, {
        toValue: 2.8, duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ring1Opacity, {
        toValue: 0, duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ring2Scale, {
          toValue: 3.4, duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ring2Opacity, {
          toValue: 0, duration: 1100,
          useNativeDriver: true,
        }),
      ]).start();
    }, 150);

    // ── 2. Logo spring in (250ms) ─────────────────────────────
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(logoTransY, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 250);

    // ── 3. Shimmer on circle (800ms, loops) ──────────────────
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerTransX, {
            toValue: 80, duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerTransX, {
            toValue: -80, duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(1600),
        ])
      ).start();
    }, 800);

    // ── 4. Tagline slides up (900ms) ─────────────────────────
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1, duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTransY, {
          toValue: 0, duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    // ── 5. Loading dots bounce (1100ms) ──────────────────────
    setTimeout(() => {
      bounceDot(dot1Opacity, dot1Scale, 0).start();
      bounceDot(dot2Opacity, dot2Scale, 200).start();
      bounceDot(dot3Opacity, dot3Scale, 400).start();
    }, 1100);

    // ── 6. Fade out entire screen (1900ms) → onFinish ────────
    setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 350,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 1900);
  }, [
    dot1Opacity,
    dot1Scale,
    dot2Opacity,
    dot2Scale,
    dot3Opacity,
    dot3Scale,
    logoOpacity,
    logoScale,
    logoTransY,
    onFinish,
    ring1Opacity,
    ring1Scale,
    ring2Opacity,
    ring2Scale,
    screenOpacity,
    shimmerTransX,
    taglineOpacity,
    taglineTransY,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.bgWhite}
        translucent={Platform.OS === 'android'}
      />

      {/* ── Linear gradient background ── */}
      <LinearGradient
        colors={[
          COLORS.gradientStart,
          COLORS.gradientMid1,
          COLORS.gradientMid2,
          COLORS.gradientEnd,
        ]}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Corner decorators ── */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* ── Ring pulse 1 (blue) ── */}
      <Animated.View
        style={[
          styles.ring,
          { borderColor: COLORS.ringBlue },
          { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] },
        ]}
      />

      {/* ── Ring pulse 2 (gold) ── */}
      <Animated.View
        style={[
          styles.ring,
          { borderColor: COLORS.ringGold },
          { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
        ]}
      />

      {/* ── Logo block ── */}
      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: logoOpacity,
            transform: [
              { scale: logoScale },
              { translateY: logoTransY },
            ],
          },
        ]}
      >
        {/* Circle mark */}
        <View style={styles.circleMark}>
          {/* Navy outer ring */}
          <View style={styles.circleOuter} />
          {/* Gold crescent arc — right side */}
          <View style={styles.goldArc1} />
          <View style={styles.goldArc2} />

          {/* DT letters */}
          <View style={styles.dtInner}>
            <Text style={styles.dtLetters}>DT</Text>
            <View style={styles.dtSlash} />
          </View>

          {/* Shimmer overlay */}
          <View style={styles.shimmerClip} pointerEvents="none">
            <Animated.View
              style={[
                styles.shimmerBar,
                { transform: [{ translateX: shimmerTransX }] },
              ]}
            />
          </View>
        </View>

        {/* Brand text */}
        <View style={styles.brandText}>
          <Text style={styles.brandDeep}>Deeptech</Text>
          <Text style={styles.brandGenie}>genie</Text>
        </View>
      </Animated.View>

      {/* ── Tagline ── */}
      <Animated.View
        style={[
          styles.taglineRow,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTransY }],
          },
        ]}
      >
        <View style={styles.tagBar} />
        <Text style={styles.tagText}>SMART ASSET TRACKING</Text>
        <View style={styles.tagBar} />
      </Animated.View>

      {/* ── Loading dots ── */}
      <View style={styles.dotsRow}>
        {[
          { opacity: dot1Opacity, scale: dot1Scale, color: COLORS.dotBlue },
          { opacity: dot2Opacity, scale: dot2Scale, color: COLORS.gold },
          { opacity: dot3Opacity, scale: dot3Scale, color: COLORS.dotBlue },
        ].map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: d.color },
              { opacity: d.opacity, transform: [{ scale: d.scale }] },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const CIRCLE = 88;
const RING_SIZE = 110;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgWhite,
  },

  // Corner decorators
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
  },
  cornerTL: {
    top: 48,
    left: 20,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: COLORS.navyMid + '33',
  },
  cornerTR: {
    top: 48,
    right: 20,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: COLORS.gold + '44',
  },
  cornerBL: {
    bottom: 48,
    left: 20,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: COLORS.navyMid + '33',
  },
  cornerBR: {
    bottom: 48,
    right: 20,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: COLORS.gold + '44',
  },

  // Ring pulses
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },

  // Logo block (circle + text side by side)
  logoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // ── Circle mark ──
  circleMark: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleOuter: {
    position: 'absolute',
    inset: 0,
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 3.5,
    borderColor: COLORS.navyDark,
    backgroundColor: 'transparent',
  },
  // Gold arc — right crescent
  goldArc1: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 3.5,
    borderColor: 'transparent',
    borderRightColor: COLORS.gold,
    borderBottomColor: COLORS.gold,
    transform: [{ rotate: '-30deg' }],
    backgroundColor: 'transparent',
  },
  goldArc2: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 3.5,
    borderColor: 'transparent',
    borderRightColor: COLORS.gold + 'AA',
    transform: [{ rotate: '105deg' }],
    backgroundColor: 'transparent',
  },
  dtInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  dtLetters: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navyDark,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 26,
  },
  dtSlash: {
    position: 'absolute',
    bottom: -4,
    width: 36,
    height: 2.5,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
    transform: [{ rotate: '-18deg' }],
  },
  shimmerClip: {
    position: 'absolute',
    inset: 0,
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: CIRCLE,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ skewX: '-15deg' }],
  },

  // ── Brand text ──
  brandText: {
    flexDirection: 'column',
  },
  brandDeep: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.navyDark,
    letterSpacing: 0.5,
    lineHeight: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  brandGenie: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 0.5,
    lineHeight: 30,
    paddingLeft: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // ── Tagline ──
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  tagBar: {
    width: 20,
    height: 1.5,
    backgroundColor: COLORS.navyMid + '55',
    borderRadius: 1,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.taglineText,
    letterSpacing: 3,
    fontWeight: '500',
  },

  // ── Loading dots ──
  dotsRow: {
    position: 'absolute',
    bottom: height * 0.08,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
