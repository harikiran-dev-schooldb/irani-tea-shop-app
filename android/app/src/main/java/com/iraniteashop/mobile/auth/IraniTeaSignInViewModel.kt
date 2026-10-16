package com.iraniteashop.mobile.auth

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class SignInStep { PHONE, CODE, ACCOUNTS }

data class AccountOption(val id: String, val label: String)

data class SignInUiState(
    val phone: String = "",
    val code: String = "",
    val step: SignInStep = SignInStep.PHONE,
    val accounts: List<AccountOption> = emptyList(),
    val loading: Boolean = false,
    val resendSeconds: Int = 0,
    val error: String? = null,
)

class IraniTeaSignInViewModel : ViewModel() {
    private val client = SchoolDbWhatsAppAuthClient()
    private val _state = mutableStateOf(SignInUiState())
    val state: State<SignInUiState> = _state

    private var challengeId = ""
    private var timerJob: Job? = null

    fun updatePhone(value: String) {
        _state.value = _state.value.copy(
            phone = value.filter(Char::isDigit).takeLast(10),
            error = null,
        )
    }

    fun updateCode(value: String) {
        _state.value = _state.value.copy(
            code = value.filter(Char::isDigit).take(6),
            error = null,
        )
    }

    fun sendCode() {
        val current = _state.value
        if (current.phone.length != 10 || current.phone.firstOrNull() !in '6'..'9') {
            _state.value = current.copy(error = "Enter a valid 10-digit mobile number")
            return
        }
        runRequest {
            client.sendCode(current.phone)
            _state.value = _state.value.copy(step = SignInStep.CODE, code = "")
            startResendTimer()
        }
    }

    fun verifyCode() {
        val current = _state.value
        if (current.code.length != 6) {
            _state.value = current.copy(error = "Enter the 6-digit WhatsApp code")
            return
        }
        runRequest {
            val result = client.verifyCode(current.phone, current.code)
            if (result.ticket != null) {
                client.activate(result.ticket)
            } else {
                challengeId = result.challengeId.orEmpty()
                _state.value = _state.value.copy(
                    step = SignInStep.ACCOUNTS,
                    accounts = result.accounts,
                )
            }
        }
    }

    fun selectAccount(accountId: String) {
        val current = _state.value
        runRequest {
            val ticket = client.selectAccount(challengeId, accountId)
            client.activate(ticket)
        }
    }

    fun resendCode() {
        if (_state.value.resendSeconds == 0) sendCode()
    }

    fun changeNumber() {
        timerJob?.cancel()
        challengeId = ""
        _state.value = _state.value.copy(
            code = "",
            step = SignInStep.PHONE,
            accounts = emptyList(),
            loading = false,
            resendSeconds = 0,
            error = null,
        )
    }

    private fun runRequest(block: suspend () -> Unit) {
        if (_state.value.loading) return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            runCatching { block() }
                .onSuccess { _state.value = _state.value.copy(loading = false) }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        loading = false,
                        error = error.message ?: "Could not complete sign in",
                    )
                }
        }
    }

    private fun startResendTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            for (remaining in 60 downTo 0) {
                _state.value = _state.value.copy(resendSeconds = remaining)
                if (remaining > 0) delay(1_000)
            }
        }
    }
}
