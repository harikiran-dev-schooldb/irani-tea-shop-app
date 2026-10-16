package com.iraniteashop.mobile.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iraniteashop.mobile.ui.theme.Coffee
import com.iraniteashop.mobile.ui.theme.Cream
import com.iraniteashop.mobile.ui.theme.Saffron

@Composable
fun IraniTeaSignInScreen(viewModel: IraniTeaSignInViewModel = viewModel()) {
    val state by viewModel.state
    val focusManager = LocalFocusManager.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Cream)
            .systemBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .background(Saffron, RoundedCornerShape(22.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Coffee, null, tint = Coffee, modifier = Modifier.size(41.dp))
            }
            Spacer(Modifier.height(15.dp))
            Text("Irani Tea", color = Coffee, fontSize = 32.sp, fontWeight = FontWeight.Bold)
            Text(
                "Shop staff sign in",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 17.sp,
            )
            Spacer(Modifier.height(26.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
            ) {
                Column(Modifier.padding(24.dp)) {
                    when (state.step) {
                        SignInStep.PHONE -> PhoneStep(state, viewModel, focusManager::clearFocus)
                        SignInStep.CODE -> CodeStep(state, viewModel, focusManager::clearFocus)
                        SignInStep.ACCOUNTS -> AccountStep(state, viewModel)
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.AutoMirrored.Filled.Chat,
                    null,
                    tint = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.size(17.dp),
                )
                Text(
                    "  Secure sign-in with WhatsApp verification",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ColumnScope.PhoneStep(
    state: SignInUiState,
    viewModel: IraniTeaSignInViewModel,
    clearFocus: () -> Unit,
) {
    Heading("Welcome back", "Enter the registered mobile number for your Irani Tea account.")
    OutlinedTextField(
        value = state.phone,
        onValueChange = viewModel::updatePhone,
        modifier = Modifier.fillMaxWidth(),
        enabled = !state.loading,
        label = { Text("Mobile number") },
        prefix = { Text("+91 ") },
        leadingIcon = { Icon(Icons.Default.Phone, null) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { clearFocus(); viewModel.sendCode() }),
    )
    ErrorText(state.error)
    Spacer(Modifier.height(20.dp))
    PrimaryButton("Send WhatsApp code", state.loading) {
        clearFocus()
        viewModel.sendCode()
    }
}

@Composable
private fun ColumnScope.CodeStep(
    state: SignInUiState,
    viewModel: IraniTeaSignInViewModel,
    clearFocus: () -> Unit,
) {
    Heading("Check WhatsApp", "Enter the six-digit code sent to +91 ••••••${state.phone.takeLast(4)}.")
    OutlinedTextField(
        value = state.code,
        onValueChange = viewModel::updateCode,
        modifier = Modifier.fillMaxWidth(),
        enabled = !state.loading,
        label = { Text("Six-digit code") },
        leadingIcon = { Icon(Icons.Default.Lock, null) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.NumberPassword,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(onDone = { clearFocus(); viewModel.verifyCode() }),
    )
    ErrorText(state.error)
    Spacer(Modifier.height(20.dp))
    PrimaryButton("Verify and continue", state.loading) {
        clearFocus()
        viewModel.verifyCode()
    }
    Spacer(Modifier.height(5.dp))
    TextButton(
        onClick = viewModel::resendCode,
        enabled = !state.loading && state.resendSeconds == 0,
        modifier = Modifier.align(Alignment.CenterHorizontally),
    ) {
        Text(
            if (state.resendSeconds > 0) "Resend code in ${state.resendSeconds}s"
            else "Resend WhatsApp code",
        )
    }
    TextButton(
        onClick = viewModel::changeNumber,
        enabled = !state.loading,
        modifier = Modifier.align(Alignment.CenterHorizontally),
    ) { Text("Change number") }
}

@Composable
private fun ColumnScope.AccountStep(state: SignInUiState, viewModel: IraniTeaSignInViewModel) {
    Heading("Choose an account", "Select the authorised account to use for Irani Tea.")
    state.accounts.forEach { account ->
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp)
                .clickable(enabled = !state.loading) { viewModel.selectAccount(account.id) },
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(account.label.replace('_', ' '), modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                if (state.loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                else Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
            }
        }
    }
    ErrorText(state.error)
    TextButton(onClick = viewModel::changeNumber, modifier = Modifier.align(Alignment.CenterHorizontally)) {
        Text("Start again")
    }
}

@Composable
private fun Heading(title: String, subtitle: String) {
    Text(title, color = Coffee, fontSize = 23.sp, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(8.dp))
    Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 21.sp)
    Spacer(Modifier.height(20.dp))
}

@Composable
private fun ErrorText(message: String?) {
    if (message != null) {
        Spacer(Modifier.height(12.dp))
        Text(message, color = MaterialTheme.colorScheme.error, fontSize = 14.sp)
    }
}

@Composable
private fun PrimaryButton(label: String, loading: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(54.dp),
        enabled = !loading,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Saffron, contentColor = Coffee),
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.5.dp, color = Coffee)
        else Text(label, fontWeight = FontWeight.Bold)
    }
}
