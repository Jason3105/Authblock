import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ─── Palette ────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF2563EB);       // Blue-600
  static const Color primaryDark = Color(0xFF1D4ED8);   // Blue-700
  static const Color primaryLight = Color(0xFFEFF6FF);  // Blue-50
  static const Color surface = Color(0xFFF8FAFC);       // Slate-50
  static const Color card = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF0F172A);     // Slate-900
  static const Color muted = Color(0xFF64748B);         // Slate-500
  static const Color border = Color(0xFFE2E8F0);        // Slate-200
  static const Color borderLight = Color(0xFFF1F5F9);   // Slate-100
  static const Color success = Color(0xFF059669);       // Emerald-600
  static const Color successLight = Color(0xFFECFDF5);  // Emerald-50
  static const Color error = Color(0xFFDC2626);         // Red-600
  static const Color errorLight = Color(0xFFFEF2F2);    // Red-50
  static const Color warning = Color(0xFFD97706);       // Amber-600
  static const Color warningLight = Color(0xFFFFFBEB);  // Amber-50
  static const Color slate700 = Color(0xFF334155);
  static const Color slate900 = Color(0xFF0F172A);

  // Admin accent
  static const Color adminAccent = Color(0xFF7C3AED);   // Violet-600 (admin only)
  static const Color adminLight = Color(0xFFF5F3FF);

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
          surface: surface,
          onSurface: onSurface,
        ),
        scaffoldBackgroundColor: surface,
        textTheme: GoogleFonts.interTextTheme().copyWith(
          displayLarge: GoogleFonts.inter(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: onSurface,
            letterSpacing: -0.5,
          ),
          displayMedium: GoogleFonts.inter(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: onSurface,
            letterSpacing: -0.5,
          ),
          headlineMedium: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: onSurface,
          ),
          titleLarge: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: onSurface,
          ),
          titleMedium: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: onSurface,
          ),
          bodyLarge: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: onSurface,
          ),
          bodyMedium: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: muted,
          ),
          labelSmall: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: muted,
          ),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: card,
          foregroundColor: onSurface,
          elevation: 0,
          scrolledUnderElevation: 1,
          shadowColor: border,
          centerTitle: false,
          titleTextStyle: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: onSurface,
          ),
        ),
        cardTheme: CardThemeData(
          color: card,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: border),
          ),
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: card,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: border, width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: border, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: primary, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: error, width: 1.5),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          labelStyle: GoogleFonts.inter(fontSize: 13, color: muted),
          hintStyle: GoogleFonts.inter(fontSize: 14, color: Color(0xFFCBD5E1)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: onSurface,
            foregroundColor: card,
            elevation: 0,
            padding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: onSurface,
            side: const BorderSide(color: border, width: 1.5),
            padding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: border,
          thickness: 1,
          space: 0,
        ),
        chipTheme: ChipThemeData(
          backgroundColor: borderLight,
          labelStyle: GoogleFonts.inter(
              fontSize: 11, fontWeight: FontWeight.w700),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        ),
      );
}

// ─── Reusable Decorations ──────────────────────────────────────────────────

BoxDecoration cardDecoration({Color? color, double radius = 20}) =>
    BoxDecoration(
      color: color ?? AppTheme.card,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: AppTheme.border),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.04),
          blurRadius: 24,
          offset: const Offset(0, 4),
        ),
      ],
    );
