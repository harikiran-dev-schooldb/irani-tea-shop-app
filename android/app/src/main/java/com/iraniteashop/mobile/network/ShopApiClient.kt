package com.iraniteashop.mobile.network

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess

import com.iraniteashop.mobile.BuildConfig
import com.iraniteashop.mobile.model.CartLine
import com.iraniteashop.mobile.model.ShopData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class ShopApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
) {
    suspend fun load(): Pair<ShopData, String> = withContext(Dispatchers.IO) {
        request("GET", null).let { ShopJson.parse(it) to it }
    }

    suspend fun createOrder(
        customer: String,
        paymentMode: String,
        lines: List<CartLine>,
    ): Pair<ShopData, String> {
        val payload = JSONObject()
            .put("kind", "order")
            .put("customer", customer.ifBlank { "Walk-in" })
            .put("paymentMode", paymentMode)
            .put("itemCount", lines.sumOf { it.quantity })
            .put("total", lines.sumOf { it.total })
            .put("items", JSONArray().apply {
                lines.forEach { line ->
                    put(
                        JSONObject()
                            .put("id", line.item.id)
                            .put("name", line.item.name)
                            .put("quantity", line.quantity)
                            .put("price", line.item.price),
                    )
                }
            })
        return post(payload)
    }

    suspend fun addExpense(category: String, amount: Int, note: String): Pair<ShopData, String> =
        post(
            JSONObject()
                .put("kind", "expense")
                .put("category", category.ifBlank { "Other" })
                .put("amount", amount)
                .put("note", note),
        )

    suspend fun updateOrderStatus(id: String, status: String): Pair<ShopData, String> =
        post(JSONObject().put("kind", "order-status").put("id", id).put("status", status))

    suspend fun updateOrder(
        id: String,
        customer: String,
        itemCount: Int,
        total: Int,
        createdAt: String,
    ): Pair<ShopData, String> {
        val indiaTime = runCatching {
            Instant.parse(createdAt).atZone(ZoneId.of("Asia/Kolkata"))
        }.getOrNull()
        val payload = JSONObject()
            .put("kind", "order-update")
            .put("id", id)
            .put("customer", customer.ifBlank { "Walk-in" })
            .put("itemCount", itemCount)
            .put("total", total)
        indiaTime?.let {
            payload
                .put("date", it.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .put("time", it.format(DateTimeFormatter.ofPattern("HH:mm")))
        }
        return post(payload)
    }

    suspend fun deleteOrder(id: String): Pair<ShopData, String> =
        post(JSONObject().put("kind", "order-delete").put("id", id))

    suspend fun toggleMenuItem(id: String, isAvailable: Boolean): Pair<ShopData, String> =
        post(
            JSONObject()
                .put("kind", "menu-toggle")
                .put("id", id)
                .put("isAvailable", isAvailable),
        )

    private suspend fun post(payload: JSONObject): Pair<ShopData, String> = withContext(Dispatchers.IO) {
        request("POST", payload.toString()).let { ShopJson.parse(it) to it }
    }

    private suspend fun request(method: String, body: String?): String {
        val token = sessionToken()
        val connection = (URL(baseUrl + "api/shop").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                outputStream.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
            }
        }

        return try {
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val message = runCatching { JSONObject(response).optString("error") }.getOrNull()
                throw IllegalStateException(message?.takeIf(String::isNotBlank) ?: "Server returned $status")
            }
            response
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun sessionToken(): String {
        var token: String? = null
        var failure: String? = null
        Clerk.auth
            .getToken()
            .onSuccess { token = it }
            .onFailure { failure = it.errorMessage }
        return token?.takeIf(String::isNotBlank)
            ?: throw IllegalStateException(failure ?: "Your session expired. Please sign in again.")
    }
}
