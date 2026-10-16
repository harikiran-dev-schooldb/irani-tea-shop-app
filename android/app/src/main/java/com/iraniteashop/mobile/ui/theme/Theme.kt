package com.iraniteashop.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Coffee = Color(0xFF32170E)
val Saffron = Color(0xFFD38B20)
val Cream = Color(0xFFFFF8EE)
val Sage = Color(0xFF4E6859)
val Ink = Color(0xFF2B211D)
val Muted = Color(0xFF756860)

private val LightColors = lightColorScheme(
    primary = Coffee,
    onPrimary = Color.White,
    secondary = Saffron,
    onSecondary = Coffee,
    tertiary = Sage,
    background = Cream,
    onBackground = Ink,
    surface = Color(0xFFFFFCF7),
    onSurface = Ink,
    surfaceVariant = Color(0xFFF2E8DB),
    onSurfaceVariant = Muted,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFF0B55B),
    secondary = Color(0xFFE4A23D),
    tertiary = Color(0xFFA8C5B3),
    background = Color(0xFF1E100B),
    surface = Color(0xFF2B1710),
)

@Composable
fun IraniTeaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = androidx.compose.material3.Typography(),
        content = content,
    )
}
