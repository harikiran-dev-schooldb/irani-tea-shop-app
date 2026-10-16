package com.iraniteashop.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.clerk.api.session.Session
import kotlinx.coroutines.launch
import com.iraniteashop.mobile.auth.IraniTeaSignInScreen
import com.iraniteashop.mobile.ui.IraniTeaApp
import com.iraniteashop.mobile.ui.theme.IraniTeaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IraniTeaTheme {
                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Clerk publishable key is not configured.")
                    }
                } else {
                    val initialized by Clerk.isInitialized.collectAsStateWithLifecycle()
                    val session by Clerk.sessionFlow.collectAsStateWithLifecycle()
                    when {
                        !initialized -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                        session?.status == Session.SessionStatus.ACTIVE -> {
                            val scope = rememberCoroutineScope()
                            IraniTeaApp(onSignOut = { scope.launch { Clerk.auth.signOut() } })
                        }
                        else -> IraniTeaSignInScreen()
                    }
                }
            }
        }
    }
}
