package com.iraniteashop.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Coffee = Color(0xFF321A12)
val Saffron = Color(0xFFD88916)
val Cream = Color(0xFFFFF9F0)
val Sage = Color(0xFF496A58)
val Ink = Color(0xFF271D19)
val Muted = Color(0xFF746760)
val Porcelain = Color(0xFFFFFDF9)
val Sand = Color(0xFFF4EBDD)
val SaffronSoft = Color(0xFFFFE8BF)
val CoffeeSoft = Color(0xFFEEDFD8)

private val LightColors = lightColorScheme(
    primary = Coffee,
    onPrimary = Color.White,
    primaryContainer = CoffeeSoft,
    onPrimaryContainer = Coffee,
    secondary = Saffron,
    onSecondary = Coffee,
    secondaryContainer = SaffronSoft,
    onSecondaryContainer = Coffee,
    tertiary = Sage,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFDDEBE1),
    onTertiaryContainer = Color(0xFF173A28),
    background = Cream,
    onBackground = Ink,
    surface = Porcelain,
    onSurface = Ink,
    surfaceVariant = Sand,
    onSurfaceVariant = Muted,
    outline = Color(0xFFA99990),
    outlineVariant = Color(0xFFE3D8CE),
    error = Color(0xFFB33B35),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFF0B55B),
    onPrimary = Color(0xFF3F2100),
    primaryContainer = Color(0xFF56301E),
    onPrimaryContainer = Color(0xFFFFDACD),
    secondary = Color(0xFFE4A23D),
    onSecondary = Color(0xFF3E2800),
    secondaryContainer = Color(0xFF604300),
    onSecondaryContainer = Color(0xFFFFDEA3),
    tertiary = Color(0xFFA8C5B3),
    background = Color(0xFF1E100B),
    surface = Color(0xFF2B1710),
    surfaceVariant = Color(0xFF43332C),
    outline = Color(0xFFBFAFA7),
    outlineVariant = Color(0xFF54443D),
)

private val IraniTeaTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 32.sp,
        lineHeight = 38.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 25.sp,
        lineHeight = 31.sp,
        letterSpacing = (-0.25).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 23.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
)

private val IraniTeaShapes = Shapes(
    small = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(18.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(26.dp),
)

@Composable
fun IraniTeaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = IraniTeaTypography,
        shapes = IraniTeaShapes,
        content = content,
    )
}
