package com.iraniteashop.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.iraniteashop.mobile.ui.IraniTeaApp
import com.iraniteashop.mobile.ui.theme.IraniTeaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IraniTeaTheme {
                IraniTeaApp()
            }
        }
    }
}
