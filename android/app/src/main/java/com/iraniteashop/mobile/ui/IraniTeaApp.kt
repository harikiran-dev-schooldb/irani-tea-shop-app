package com.iraniteashop.mobile.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iraniteashop.mobile.model.CartLine
import com.iraniteashop.mobile.model.DailyClosing
import com.iraniteashop.mobile.model.MenuItem
import com.iraniteashop.mobile.model.Order
import com.iraniteashop.mobile.model.ShopData
import com.iraniteashop.mobile.model.Transaction
import com.iraniteashop.mobile.ui.theme.Saffron
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private enum class Section(val label: String, val icon: ImageVector) {
    Dashboard("Home", Icons.Outlined.Dashboard),
    Counter("Counter", Icons.Outlined.Storefront),
    Orders("Orders", Icons.Outlined.ShoppingBag),
    Menu("Menu", Icons.Outlined.Inventory2),
    Reports("Reports", Icons.Outlined.Assessment),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IraniTeaApp(
    viewModel: ShopViewModel = viewModel(),
    onSignOut: () -> Unit = {},
) {
    val state by viewModel.state
    var section by remember { mutableStateOf(Section.Dashboard) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Irani Tea",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        Text(
                            section.label.uppercase(),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                },
                navigationIcon = {
                    Surface(
                        modifier = Modifier.padding(start = 16.dp, end = 8.dp).size(48.dp),
                        shape = RoundedCornerShape(17.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        border = BorderStroke(1.dp, Saffron.copy(alpha = .20f)),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Coffee,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(27.dp),
                            )
                        }
                    }
                },
                actions = {
                    TopActionButton(
                        icon = Icons.Default.Refresh,
                        description = "Refresh",
                        enabled = !state.loading,
                        onClick = viewModel::refresh,
                    )
                    TopActionButton(
                        icon = Icons.AutoMirrored.Filled.Logout,
                        description = "Sign out",
                        enabled = !state.saving,
                        onClick = onSignOut,
                    )
                    Spacer(Modifier.width(8.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            IraniTeaNavigationDock(section) { section = it }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            state.message?.let { message ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .clickable(onClick = viewModel::clearMessage),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.tertiaryContainer,
                    border = BorderStroke(
                        1.dp,
                        MaterialTheme.colorScheme.tertiary.copy(alpha = .18f),
                    ),
                ) {
                    Text(
                        message,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                    )
                }
            }

            if (state.loading && state.data.menu.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                when (section) {
                    Section.Dashboard -> DashboardScreen(state.data, state.fromCache)
                    Section.Counter -> CounterScreen(
                        data = state.data,
                        cart = state.cart,
                        saving = state.saving,
                        onAdd = viewModel::addToCart,
                        onQuantity = viewModel::changeQuantity,
                        onPlaceOrder = viewModel::placeOrder,
                    )
                    Section.Orders -> OrdersScreen(
                        data = state.data,
                        saving = state.saving,
                        onStatus = viewModel::updateOrderStatus,
                        onUpdate = viewModel::updateOrder,
                        onDelete = viewModel::deleteOrder,
                    )
                    Section.Menu -> MenuScreen(state.data.menu, state.saving, viewModel::toggleMenuItem)
                    Section.Reports -> ReportsScreen(
                        data = state.data,
                        saving = state.saving,
                        onExpense = viewModel::addExpense,
                        onSale = viewModel::addSale,
                        onUpdate = viewModel::updateTransaction,
                        onDelete = viewModel::deleteTransaction,
                        onCloseDay = viewModel::closeDay,
                    )
                }
            }
        }
    }
}

@Composable
private fun TopActionButton(
    icon: ImageVector,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier.padding(horizontal = 3.dp).size(40.dp),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .72f)),
    ) {
        IconButton(onClick = onClick, enabled = enabled) {
            Icon(
                icon,
                contentDescription = description,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(21.dp),
            )
        }
    }
}

@Composable
private fun IraniTeaNavigationDock(selected: Section, onSelect: (Section) -> Unit) {
    val shape = RoundedCornerShape(30.dp)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .shadow(
                elevation = 16.dp,
                shape = shape,
                ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = .08f),
                spotColor = MaterialTheme.colorScheme.primary.copy(alpha = .13f),
            ),
        shape = shape,
        color = Color.Transparent,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .70f)),
    ) {
        Row(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        listOf(
                            MaterialTheme.colorScheme.surface,
                            MaterialTheme.colorScheme.secondaryContainer.copy(alpha = .34f),
                            MaterialTheme.colorScheme.surface,
                        ),
                    ),
                )
                .padding(5.dp),
        ) {
            Section.entries.forEach { item ->
                val active = selected == item
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(25.dp))
                        .background(
                            if (active) MaterialTheme.colorScheme.secondaryContainer
                            else Color.Transparent,
                        )
                        .selectable(
                            selected = active,
                            role = Role.Tab,
                            onClick = { onSelect(item) },
                        )
                        .padding(vertical = 9.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.label,
                        modifier = Modifier.size(22.dp),
                        tint = if (active) MaterialTheme.colorScheme.secondary
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.labelMedium,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardScreen(data: ShopData, fromCache: Boolean) {
    val todayTransactions = data.transactions.filter { isToday(it.createdAt) }
    val sales = todayTransactions.filter { it.type == "sale" }.sumOf { it.amount }
    val cashSales = todayTransactions
        .filter { it.type == "sale" && it.paymentMode != "online" }
        .sumOf { it.amount }
    val expenses = todayTransactions.filter { it.type == "expense" }.sumOf { it.amount }
    val activeOrders = data.orders.count { it.status != "completed" }
    val lowStock = data.menu.count { it.stockQty <= it.lowStockThreshold }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenIntro(
                title = "Today at the shop",
                subtitle = if (fromCache) "Viewing the latest saved snapshot"
                else LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMMM")),
                eyebrow = if (fromCache) "OFFLINE" else "OVERVIEW",
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard("Sales", money(sales), Icons.Default.Payments, Modifier.weight(1f))
                MetricCard("Net cash", money(cashSales - expenses), Icons.Outlined.Assessment, Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard("Active orders", activeOrders.toString(), Icons.Outlined.ShoppingBag, Modifier.weight(1f))
                MetricCard("Low stock", lowStock.toString(), Icons.Outlined.Inventory2, Modifier.weight(1f))
            }
        }
        item { SectionTitle("Recent orders") }
        if (data.orders.isEmpty()) {
            item { EmptyCard("No orders yet. Open Counter to create the first order.") }
        } else {
            items(data.orders.take(5), key = { it.id }) { order -> OrderCard(order, null) }
        }
    }
}

@Composable
private fun MetricCard(title: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.secondary)
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun CounterScreen(
    data: ShopData,
    cart: List<CartLine>,
    saving: Boolean,
    onAdd: (MenuItem) -> Unit,
    onQuantity: (String, Int) -> Unit,
    onPlaceOrder: (String, String, () -> Unit) -> Unit,
) {
    var checkoutOpen by remember { mutableStateOf(false) }
    val total = cart.sumOf { it.total }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(
                start = 18.dp,
                top = 14.dp,
                end = 18.dp,
                bottom = if (cart.isEmpty()) 28.dp else 116.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                ScreenIntro(
                    title = "Quick counter",
                    subtitle = "Build an order in a few taps",
                    eyebrow = "NEW ORDER",
                )
            }
            items(data.menu, key = { it.id }) { item ->
                val quantity = cart.firstOrNull { it.item.id == item.id }?.quantity ?: 0
                MenuOrderCard(item, quantity, onAdd, onQuantity)
            }
        }

        if (cart.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 16.dp,
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        Text(
                            "${cart.sumOf { it.quantity }} items",
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = .72f),
                            style = MaterialTheme.typography.labelMedium,
                        )
                        Text(
                            money(total),
                            color = MaterialTheme.colorScheme.onPrimary,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                    Button(
                        onClick = { checkoutOpen = true },
                        enabled = !saving,
                        shape = RoundedCornerShape(15.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        ),
                    ) {
                        Text("Place order")
                    }
                }
            }
        }
    }

    if (checkoutOpen) {
        CheckoutDialog(
            total = total,
            saving = saving,
            onDismiss = { if (!saving) checkoutOpen = false },
            onConfirm = { customer, payment ->
                onPlaceOrder(customer, payment) { checkoutOpen = false }
            },
        )
    }
}

@Composable
private fun MenuOrderCard(
    item: MenuItem,
    quantity: Int,
    onAdd: (MenuItem) -> Unit,
    onQuantity: (String, Int) -> Unit,
) {
    val enabled = item.isAvailable && item.stockQty > 0
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (enabled) MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .72f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (enabled) 1.dp else 0.dp),
        border = BorderStroke(
            1.dp,
            if (enabled) MaterialTheme.colorScheme.outlineVariant.copy(alpha = .58f)
            else MaterialTheme.colorScheme.outlineVariant.copy(alpha = .34f),
        ),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 17.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    item.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (enabled) MaterialTheme.colorScheme.onSurface
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${item.category}  •  ${item.stockQty} in stock",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    money(item.price),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
            Spacer(Modifier.width(12.dp))
            if (quantity == 0) {
                FilledTonalButton(
                    onClick = { onAdd(item) },
                    enabled = enabled,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        disabledContainerColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = .58f),
                        disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = .65f),
                    ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 13.dp),
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(if (enabled) "Add" else "Unavailable")
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                    IconButton(onClick = { onQuantity(item.id, -1) }) {
                        Icon(Icons.Default.Remove, contentDescription = "Remove one", modifier = Modifier.size(19.dp))
                    }
                    Text(quantity.toString(), fontWeight = FontWeight.Bold)
                    IconButton(onClick = { onQuantity(item.id, 1) }, enabled = quantity < item.stockQty) {
                        Icon(Icons.Default.Add, contentDescription = "Add one", modifier = Modifier.size(19.dp))
                    }
                    }
                }
            }
        }
    }
}

@Composable
private fun CheckoutDialog(
    total: Int,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit,
) {
    var customer by remember { mutableStateOf("") }
    var payment by remember { mutableStateOf("cash") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Complete order") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Total ${money(total)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                OutlinedTextField(
                    value = customer,
                    onValueChange = { customer = it },
                    label = { Text("Customer (optional)") },
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("cash" to "Cash", "online" to "Online").forEach { (value, label) ->
                        if (payment == value) Button(onClick = { payment = value }) { Text(label) }
                        else OutlinedButton(onClick = { payment = value }) { Text(label) }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(customer, payment) }, enabled = !saving) {
                if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Save order")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun OrdersScreen(
    data: ShopData,
    saving: Boolean,
    onStatus: (String, String) -> Unit,
    onUpdate: (Order, String, Int, Int, () -> Unit) -> Unit,
    onDelete: (Order, () -> Unit) -> Unit,
) {
    var editingOrder by remember { mutableStateOf<Order?>(null) }
    var deletingOrder by remember { mutableStateOf<Order?>(null) }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenIntro(
                title = "Orders",
                subtitle = "Move each order through the kitchen",
                eyebrow = "${data.orders.count { it.status != "completed" }} ACTIVE",
            )
        }
        if (data.orders.isEmpty()) item { EmptyCard("No orders recorded yet.") }
        items(data.orders, key = { it.id }) { order ->
            val next = when (order.status) {
                "preparing" -> "ready"
                "ready" -> "completed"
                else -> null
            }
            OrderCard(
                order = order,
                onAdvance = next?.let { status -> { onStatus(order.id, status) } },
                saving = saving,
                onEdit = { editingOrder = order },
                onDelete = { deletingOrder = order },
            )
        }
    }

    editingOrder?.let { order ->
        EditOrderDialog(
            order = order,
            saving = saving,
            onDismiss = { if (!saving) editingOrder = null },
            onConfirm = { customer, itemCount, total ->
                onUpdate(order, customer, itemCount, total) { editingOrder = null }
            },
        )
    }

    deletingOrder?.let { order ->
        AlertDialog(
            onDismissRequest = { if (!saving) deletingOrder = null },
            title = { Text("Delete order #${order.orderNo}?") },
            text = {
                Text("This removes the order and its sale, and restores the ordered stock. This cannot be undone.")
            },
            confirmButton = {
                Button(
                    onClick = { onDelete(order) { deletingOrder = null } },
                    enabled = !saving,
                ) {
                    if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingOrder = null }, enabled = !saving) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun OrderCard(
    order: Order,
    onAdvance: (() -> Unit)?,
    saving: Boolean = false,
    onEdit: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null,
) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Order #${order.orderNo}", fontWeight = FontWeight.ExtraBold)
                    Text(order.customer, style = MaterialTheme.typography.bodySmall)
                }
                Text(money(order.total), fontWeight = FontWeight.Bold)
                onEdit?.let {
                    IconButton(onClick = it, enabled = !saving) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit order #${order.orderNo}")
                    }
                }
                onDelete?.let {
                    IconButton(onClick = it, enabled = !saving) {
                        Icon(
                            Icons.Outlined.DeleteOutline,
                            contentDescription = "Delete order #${order.orderNo}",
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                StatusPill(order.status)
                Spacer(Modifier.weight(1f))
                Text("${order.itemCount} items", style = MaterialTheme.typography.bodySmall)
                onAdvance?.let {
                    Spacer(Modifier.width(10.dp))
                    FilledTonalButton(onClick = it, enabled = !saving) {
                        Text(if (order.status == "preparing") "Ready" else "Complete")
                    }
                }
            }
        }
    }
}

@Composable
private fun EditOrderDialog(
    order: Order,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, Int, Int) -> Unit,
) {
    var customer by remember(order.id) { mutableStateOf(order.customer) }
    var itemCount by remember(order.id) { mutableStateOf(order.itemCount.toString()) }
    var total by remember(order.id) { mutableStateOf(order.total.toString()) }
    val itemCountValue = itemCount.toIntOrNull() ?: 0
    val totalValue = total.toIntOrNull() ?: 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit order #${order.orderNo}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = customer,
                    onValueChange = { customer = it },
                    label = { Text("Customer") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = itemCount,
                    onValueChange = { itemCount = it.filter(Char::isDigit) },
                    label = { Text("Item count") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = total,
                    onValueChange = { total = it.filter(Char::isDigit) },
                    label = { Text("Total amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(customer, itemCountValue, totalValue) },
                enabled = itemCountValue > 0 && totalValue > 0 && !saving,
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Update")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun StatusPill(status: String) {
    val color = when (status) {
        "completed" -> Color(0xFF3F7055)
        "ready" -> Color(0xFFB16A13)
        else -> MaterialTheme.colorScheme.primary
    }
    Text(
        status.replaceFirstChar { it.uppercase() },
        modifier = Modifier.background(color.copy(alpha = .13f), RoundedCornerShape(999.dp)).padding(horizontal = 10.dp, vertical = 5.dp),
        color = color,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
    )
}

@Composable
private fun MenuScreen(menu: List<MenuItem>, saving: Boolean, onToggle: (MenuItem) -> Unit) {
    LazyColumn(
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenIntro(
                title = "Menu & stock",
                subtitle = "Control what is available at the counter",
                eyebrow = "${menu.count { it.isAvailable }} OF ${menu.size} AVAILABLE",
            )
        }
        items(menu, key = { it.id }) { item ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                border = BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.outlineVariant.copy(alpha = .58f),
                ),
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 17.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Text(
                            item.name,
                            style = MaterialTheme.typography.titleMedium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "${money(item.price)}  •  ${item.stockQty} in stock",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (item.stockQty <= item.lowStockThreshold) {
                            Text(
                                "LOW STOCK",
                                modifier = Modifier
                                    .background(
                                        MaterialTheme.colorScheme.error.copy(alpha = .09f),
                                        RoundedCornerShape(7.dp),
                                    )
                                    .padding(horizontal = 8.dp, vertical = 3.dp),
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Spacer(Modifier.width(14.dp))
                    Switch(
                        checked = item.isAvailable,
                        onCheckedChange = { onToggle(item) },
                        enabled = !saving,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.surface,
                            checkedTrackColor = MaterialTheme.colorScheme.secondary,
                            checkedBorderColor = MaterialTheme.colorScheme.secondary,
                            uncheckedThumbColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            uncheckedTrackColor = MaterialTheme.colorScheme.surfaceVariant,
                            uncheckedBorderColor = MaterialTheme.colorScheme.outline,
                        ),
                    )
                }
            }
        }
    }
}

@Composable
private fun ReportsScreen(
    data: ShopData,
    saving: Boolean,
    onExpense: (String, Int, String, String, String, () -> Unit) -> Unit,
    onSale: (String, Int, String, String, String, String, () -> Unit) -> Unit,
    onUpdate: (Transaction, String, Int, String, String, String, String, () -> Unit) -> Unit,
    onDelete: (Transaction, () -> Unit) -> Unit,
    onCloseDay: (String, Int, Int, Int, () -> Unit) -> Unit,
) {
    var expenseOpen by remember { mutableStateOf(false) }
    var saleOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Transaction?>(null) }
    var deleting by remember { mutableStateOf<Transaction?>(null) }
    var selectedDate by remember { mutableStateOf(todayIndia()) }
    val selectedTransactions = data.transactions.filter { transactionDate(it.createdAt) == selectedDate }
    val sales = selectedTransactions.filter { it.type == "sale" }.sumOf { it.amount }
    val cashSales = selectedTransactions.filter { it.type == "sale" && it.paymentMode != "online" }.sumOf { it.amount }
    val upiSales = selectedTransactions.filter { it.type == "sale" && it.paymentMode == "online" }.sumOf { it.amount }
    val expenses = selectedTransactions.filter { it.type == "expense" }.sumOf { it.amount }
    val dailyTransactions = data.transactions
        .groupBy { transactionDate(it.createdAt) }
        .filterKeys { it.isNotBlank() }
        .toSortedMap(compareByDescending { it })

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ScreenIntro(
                    title = "Sales & expenses",
                    subtitle = "Review and close out daily cashflow",
                    eyebrow = "REPORTS",
                )
                DateButton(selectedDate, onDate = { selectedDate = it })
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { saleOpen = true }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Text("Sale")
                    }
                    OutlinedButton(onClick = { expenseOpen = true }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Text("Expense")
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard("Cash", money(cashSales), Icons.Default.Payments, Modifier.weight(1f))
                MetricCard("UPI / Online", money(upiSales), Icons.Outlined.Assessment, Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard("Total sales", money(sales), Icons.Default.Payments, Modifier.weight(1f))
                MetricCard("Expenses", money(expenses), Icons.AutoMirrored.Filled.ReceiptLong, Modifier.weight(1f))
            }
        }
        item {
            DailyClosingCard(
                date = selectedDate,
                entries = selectedTransactions,
                closing = data.closings.firstOrNull { it.businessDate == selectedDate },
                saving = saving,
                onSave = { opening, expected, actual ->
                    onCloseDay(selectedDate, opening, expected, actual) {}
                },
            )
        }
        item { SectionTitle("Transactions for ${displayDate(selectedDate)}") }
        if (selectedTransactions.isEmpty()) item { EmptyCard("No sales or expenses recorded for this date.") }
        items(selectedTransactions, key = { "tx-${it.id}" }) { transaction ->
            TransactionRow(transaction, onEdit = { editing = it }, onDelete = { deleting = it })
        }
        item { SectionTitle("Daily collections") }
        if (dailyTransactions.isEmpty()) item { EmptyCard("Daily cash and UPI totals will appear here.") }
        items(dailyTransactions.entries.take(14).toList(), key = { "day-${it.key}" }) { (date, entries) ->
            val cash = entries.filter { it.type == "sale" && it.paymentMode != "online" }.sumOf { it.amount }
            val upi = entries.filter { it.type == "sale" && it.paymentMode == "online" }.sumOf { it.amount }
            Card(Modifier.fillMaxWidth().clickable { selectedDate = date }) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(displayDate(date), fontWeight = FontWeight.Bold)
                        Text("Cash ${money(cash)} · UPI / Online ${money(upi)}", style = MaterialTheme.typography.bodySmall)
                    }
                    Text(money(cash + upi), fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }

    if (expenseOpen) {
        ExpenseDialog(
            saving = saving,
            onDismiss = { if (!saving) expenseOpen = false },
            initialDate = selectedDate,
            onConfirm = { category, amount, note, date, time ->
                onExpense(category, amount, note, date, time) {
                    selectedDate = date
                    expenseOpen = false
                }
            },
        )
    }

    if (saleOpen) {
        SaleDialog(
            saving = saving,
            onDismiss = { if (!saving) saleOpen = false },
            initialDate = selectedDate,
            onConfirm = { category, amount, paymentMode, note, date, time ->
                onSale(category, amount, paymentMode, note, date, time) {
                    selectedDate = date
                    saleOpen = false
                }
            },
        )
    }

    editing?.let { transaction ->
        EditTransactionDialog(
            transaction = transaction,
            saving = saving,
            onDismiss = { if (!saving) editing = null },
            onConfirm = { category, amount, paymentMode, note, date, time ->
                onUpdate(transaction, category, amount, paymentMode, note, date, time) {
                    selectedDate = date
                    editing = null
                }
            },
        )
    }

    deleting?.let { transaction ->
        AlertDialog(
            onDismissRequest = { if (!saving) deleting = null },
            title = { Text("Delete transaction?") },
            text = { Text("This removes ${transaction.category} (${money(transaction.amount)}) from the shop records.") },
            confirmButton = {
                Button(onClick = { onDelete(transaction) { deleting = null } }, enabled = !saving) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }, enabled = !saving) { Text("Cancel") } },
        )
    }
}

@Composable
private fun TransactionRow(transaction: Transaction, onEdit: (Transaction) -> Unit, onDelete: (Transaction) -> Unit) {
    Card {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(transaction.category, fontWeight = FontWeight.Bold)
                val paymentLabel = when (transaction.paymentMode) {
                    "online" -> "UPI / Online"
                    else -> "Cash"
                }
                Text(
                    listOfNotNull(
                        paymentLabel.takeIf { transaction.type == "sale" },
                        transaction.note.takeIf { it.isNotBlank() },
                        transactionStamp(transaction.createdAt),
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                (if (transaction.type == "expense") "−" else "+") + money(transaction.amount),
                color = if (transaction.type == "expense") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                fontWeight = FontWeight.ExtraBold,
            )
            IconButton(onClick = { onEdit(transaction) }) { Icon(Icons.Outlined.Edit, contentDescription = "Edit transaction") }
            IconButton(onClick = { onDelete(transaction) }) { Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete transaction") }
        }
    }
}

@Composable
private fun ExpenseDialog(
    saving: Boolean,
    onDismiss: () -> Unit,
    initialDate: String,
    onConfirm: (String, Int, String, String, String) -> Unit,
) {
    val categories = listOf("Stock", "Milk & tea", "Rent", "Wages", "Gas & electricity", "Other")
    var category by remember { mutableStateOf(categories.first()) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(initialDate) }
    var time by remember { mutableStateOf(nowIndiaTime()) }
    val amountValue = amount.toIntOrNull() ?: 0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add expense") },
        text = {
            Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Expense category", style = MaterialTheme.typography.labelLarge)
                ChoiceChips(categories, category) { category = it }
                OutlinedTextField(
                    amount,
                    { amount = it.filter(Char::isDigit) },
                    label = { Text("Amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                OutlinedTextField(
                    note,
                    { note = it },
                    label = { Text("Note") },
                    placeholder = { Text("Required: what was this for?") },
                )
                DateTimeFields(date, time, onDate = { date = it }, onTime = { time = it })
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(category, amountValue, note.trim(), date, time) },
                enabled = amountValue > 0 && note.isNotBlank() && !saving,
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun SaleDialog(
    saving: Boolean,
    onDismiss: () -> Unit,
    initialDate: String,
    onConfirm: (String, Int, String, String, String, String) -> Unit,
) {
    val categories = listOf("Counter sale", "Delivery", "Catering", "Other income")
    var category by remember { mutableStateOf(categories.first()) }
    var amount by remember { mutableStateOf("") }
    var paymentMode by remember { mutableStateOf("cash") }
    var note by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(initialDate) }
    var time by remember { mutableStateOf(nowIndiaTime()) }
    val amountValue = amount.toIntOrNull() ?: 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record a sale") },
        text = {
            Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    amount,
                    { amount = it.filter(Char::isDigit) },
                    label = { Text("Amount received") },
                    prefix = { Text("₹") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                Text("Payment method", style = MaterialTheme.typography.labelLarge)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (paymentMode == "cash") {
                        Button(onClick = { paymentMode = "cash" }, modifier = Modifier.weight(1f)) { Text("Cash") }
                    } else {
                        OutlinedButton(onClick = { paymentMode = "cash" }, modifier = Modifier.weight(1f)) { Text("Cash") }
                    }
                    if (paymentMode == "online") {
                        Button(onClick = { paymentMode = "online" }, modifier = Modifier.weight(1f)) { Text("UPI / Online") }
                    } else {
                        OutlinedButton(onClick = { paymentMode = "online" }, modifier = Modifier.weight(1f)) { Text("UPI / Online") }
                    }
                }
                Text("Sale type", style = MaterialTheme.typography.labelLarge)
                ChoiceChips(categories, category) { category = it }
                OutlinedTextField(
                    note,
                    { note = it },
                    label = { Text("Note") },
                    placeholder = { Text("Optional note") },
                )
                DateTimeFields(date, time, onDate = { date = it }, onTime = { time = it })
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(category, amountValue, paymentMode, note.trim(), date, time) },
                enabled = amountValue > 0 && !saving,
            ) { Text("Save sale") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun EditTransactionDialog(
    transaction: Transaction,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, Int, String, String, String, String) -> Unit,
) {
    val categories = if (transaction.type == "expense") {
        listOf("Stock", "Milk & tea", "Rent", "Wages", "Gas & electricity", "Other")
    } else {
        listOf("Counter sale", "Delivery", "Catering", "Other income")
    }
    var category by remember(transaction.id) { mutableStateOf(transaction.category) }
    var amount by remember(transaction.id) { mutableStateOf(transaction.amount.toString()) }
    var paymentMode by remember(transaction.id) { mutableStateOf(transaction.paymentMode.ifBlank { "cash" }) }
    var note by remember(transaction.id) { mutableStateOf(transaction.note) }
    var date by remember(transaction.id) { mutableStateOf(transactionDate(transaction.createdAt).ifBlank { todayIndia() }) }
    var time by remember(transaction.id) { mutableStateOf(transactionTime(transaction.createdAt)) }
    val amountValue = amount.toIntOrNull() ?: 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit ${transaction.type}") },
        text = {
            Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Category", style = MaterialTheme.typography.labelLarge)
                ChoiceChips(categories, category) { category = it }
                OutlinedTextField(
                    amount,
                    { amount = it.filter(Char::isDigit) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Amount") },
                    prefix = { Text("₹") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                if (transaction.type == "sale") {
                    Text("Payment method", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (paymentMode == "cash") Button({ paymentMode = "cash" }, Modifier.weight(1f)) { Text("Cash") }
                        else OutlinedButton({ paymentMode = "cash" }, Modifier.weight(1f)) { Text("Cash") }
                        if (paymentMode == "online") Button({ paymentMode = "online" }, Modifier.weight(1f)) { Text("UPI / Online") }
                        else OutlinedButton({ paymentMode = "online" }, Modifier.weight(1f)) { Text("UPI / Online") }
                    }
                }
                OutlinedTextField(
                    note,
                    { note = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(if (transaction.type == "expense") "Note (required)" else "Note") },
                )
                DateTimeFields(date, time, onDate = { date = it }, onTime = { time = it })
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(category, amountValue, paymentMode, note.trim(), date, time) },
                enabled = amountValue > 0 && (transaction.type != "expense" || note.isNotBlank()) && !saving,
            ) { Text("Save changes") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun DateTimeFields(
    date: String,
    time: String,
    onDate: (String) -> Unit,
    onTime: (String) -> Unit,
) {
    Text("Date and time", style = MaterialTheme.typography.labelLarge)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        DateButton(date, onDate, Modifier.weight(1f))
        TimeButton(time, onTime, Modifier.weight(1f))
    }
}

@Composable
private fun DateButton(date: String, onDate: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val value = runCatching { LocalDate.parse(date) }.getOrDefault(LocalDate.now(indiaZone))
    OutlinedButton(
        onClick = {
            DatePickerDialog(
                context,
                { _, year, month, day -> onDate(String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day)) },
                value.year,
                value.monthValue - 1,
                value.dayOfMonth,
            ).show()
        },
        modifier = modifier,
    ) { Text(displayDate(date)) }
}

@Composable
private fun TimeButton(time: String, onTime: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val value = runCatching { LocalTime.parse(time, inputTimeFormatter) }.getOrDefault(LocalTime.now(indiaZone))
    OutlinedButton(
        onClick = {
            TimePickerDialog(
                context,
                { _, hour, minute -> onTime(String.format(Locale.US, "%02d:%02d", hour, minute)) },
                value.hour,
                value.minute,
                false,
            ).show()
        },
        modifier = modifier,
    ) { Text(runCatching { value.format(displayTimeFormatter) }.getOrDefault(time)) }
}

@Composable
private fun DailyClosingCard(
    date: String,
    entries: List<Transaction>,
    closing: DailyClosing?,
    saving: Boolean,
    onSave: (Int, Int, Int) -> Unit,
) {
    var opening by remember(date, closing?.closedAt) { mutableStateOf((closing?.openingCash ?: 0).toString()) }
    var actual by remember(date, closing?.closedAt) { mutableStateOf((closing?.actualCash ?: 0).toString()) }
    val cashSales = entries.filter { it.type == "sale" && it.paymentMode != "online" }.sumOf { it.amount }
    val expenses = entries.filter { it.type == "expense" }.sumOf { it.amount }
    val openingValue = opening.toIntOrNull() ?: 0
    val expected = openingValue + cashSales - expenses
    val actualValue = actual.toIntOrNull() ?: 0

    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Daily closing", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
            Text("Opening cash + cash sales − expenses", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    opening,
                    { opening = it.filter(Char::isDigit) },
                    modifier = Modifier.weight(1f),
                    label = { Text("Opening cash") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                OutlinedTextField(
                    actual,
                    { actual = it.filter(Char::isDigit) },
                    modifier = Modifier.weight(1f),
                    label = { Text("Actual cash") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
            }
            Text("Expected ${money(expected)} · Difference ${money(actualValue - expected)}")
            Button(
                onClick = { onSave(openingValue, expected, actualValue) },
                enabled = opening.isNotBlank() && actual.isNotBlank() && !saving,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (closing == null) "Close day" else "Update closing") }
        }
    }
}

@Composable
private fun ChoiceChips(
    choices: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        choices.forEach { choice ->
            FilterChip(
                selected = choice == selected,
                onClick = { onSelect(choice) },
                label = { Text(choice) },
                modifier = Modifier.padding(end = 2.dp),
            )
        }
    }
}

@Composable
private fun ScreenIntro(title: String, subtitle: String, eyebrow: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                Modifier
                    .width(24.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(MaterialTheme.colorScheme.secondary),
            )
            Text(
                eyebrow,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary,
                fontWeight = FontWeight.Bold,
            )
        }
        Text(
            title,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
}

@Composable
private fun EmptyCard(text: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Text(text, Modifier.fillMaxWidth().padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private val moneyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply {
    maximumFractionDigits = 0
}

private fun money(value: Int): String = moneyFormat.format(value)

private val indiaZone = ZoneId.of("Asia/Kolkata")
private val displayDateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")
private val displayTimestampFormatter = DateTimeFormatter.ofPattern("d MMM · h:mm a")
private val displayTimeFormatter = DateTimeFormatter.ofPattern("h:mm a")
private val inputTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

private fun todayIndia(): String = LocalDate.now(indiaZone).toString()

private fun nowIndiaTime(): String = LocalTime.now(indiaZone).format(inputTimeFormatter)

private fun transactionDate(timestamp: String): String = runCatching {
    Instant.parse(timestamp).atZone(indiaZone).toLocalDate().toString()
}.getOrDefault("")

private fun transactionTime(timestamp: String): String = runCatching {
    Instant.parse(timestamp).atZone(indiaZone).toLocalTime().format(inputTimeFormatter)
}.getOrDefault(nowIndiaTime())

private fun transactionStamp(timestamp: String): String = runCatching {
    Instant.parse(timestamp).atZone(indiaZone).format(displayTimestampFormatter)
}.getOrDefault("Time unavailable")

private fun displayDate(date: String): String = runCatching {
    LocalDate.parse(date).format(displayDateFormatter)
}.getOrDefault(date)

private fun isToday(timestamp: String): Boolean = runCatching {
    Instant.parse(timestamp).atZone(indiaZone).toLocalDate() == LocalDate.now(indiaZone)
}.getOrDefault(false)
