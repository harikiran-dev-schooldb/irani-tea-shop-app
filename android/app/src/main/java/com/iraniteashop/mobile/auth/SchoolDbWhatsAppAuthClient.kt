package com.iraniteashop.mobile.auth

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import com.clerk.api.signin.SignIn
import com.iraniteashop.mobile.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

data class VerificationResult(
    val ticket: String? = null,
    val challengeId: String? = null,
    val accounts: List<AccountOption> = emptyList(),
)

class SchoolDbWhatsAppAuthClient(
    private val baseUrl: String = BuildConfig.SCHOOLDB_AUTH_BASE_URL,
    private val tenantCode: String = BuildConfig.SCHOOLDB_TENANT_CODE,
) {
    suspend fun sendCode(phone: String) {
        request(
            "api/v1/public/auth/send-otp",
            JSONObject().put("schoolSlug", tenantCode).put("phone", phone),
        )
    }

    suspend fun verifyCode(
        phone: String,
        code: String,
    ): VerificationResult {
        val response = request(
            "api/v1/public/auth/verify-otp",
            JSONObject()
                .put("action", "VERIFY")
                .put("schoolSlug", tenantCode)
                .put("phone", phone)
                .put("otp", code),
        )
        if (!response.optBoolean("requiresAccountSelection")) {
            return VerificationResult(ticket = response.getString("token"))
        }
        val choices = response.getJSONArray("accounts")
        return VerificationResult(
            challengeId = response.getString("challengeId"),
            accounts = (0 until choices.length()).map { index ->
                val account = choices.getJSONObject(index)
                AccountOption(
                    id = account.getString("id"),
                    label = listOf(account.optString("name"), account.optString("role"))
                        .filter(String::isNotBlank)
                        .joinToString(" · "),
                )
            },
        )
    }

    suspend fun selectAccount(challengeId: String, accountId: String): String =
        request(
            "api/v1/public/auth/verify-otp",
            JSONObject()
                .put("action", "SELECT")
                .put("schoolSlug", tenantCode)
                .put("challengeId", challengeId)
                .put("accountId", accountId),
        ).getString("token")

    suspend fun activate(ticket: String) {
        Clerk.isInitialized.first { it }
        if (Clerk.activeSession != null) Clerk.auth.signOut()

        var sessionId: String? = null
        var failure: String? = null
        Clerk.auth.signInWithTicket(ticket)
            .onSuccess { signIn ->
                if (signIn.status == SignIn.Status.COMPLETE) sessionId = signIn.createdSessionId
            }
            .onFailure { failure = it.errorMessage }

        val id = sessionId ?: error(failure ?: "Sign-in could not be completed")
        var activated = false
        Clerk.auth.setActive(sessionId = id)
            .onSuccess { activated = true }
            .onFailure { failure = it.errorMessage }
        if (!activated) error(failure ?: "Could not activate your session")
    }

    private suspend fun request(path: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 20_000
                readTimeout = 40_000
                doOutput = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                outputStream.use { stream ->
                    stream.write(body.toString().toByteArray(StandardCharsets.UTF_8))
                }
            }
            try {
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                val response = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
                if (status !in 200..299) {
                    error(response.optString("error").ifBlank { "Server returned $status" })
                }
                response
            } finally {
                connection.disconnect()
            }
        }
}
