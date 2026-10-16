package com.iraniteashop.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.selection.selectable
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
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iraniteashop.mobile.model.CartLine
import com.iraniteashop.mobile.model.MenuItem
import com.iraniteashop.mobile.model.Order
import com.iraniteashop.mobile.model.ShopData
import com.iraniteashop.mobile.model.Transaction
import com.iraniteashop.mobile.ui.theme.Saffron
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
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
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Irani Tea", fontWeight = FontWeight.ExtraBold)
                        Text(
                            section.label,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                },
                navigationIcon = {
                    Surface(
                        modifier = Modifier.padding(start = 14.dp).size(42.dp),
                        shape = RoundedCornerShape(14.dp),
                        color = Saffron,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Coffee, contentDescription = null)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = onSignOut, enabled = !state.saving) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign out")
                    }
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
                AssistChip(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    onClick = viewModel::clearMessage,
                    label = { Text(message) },
                )
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
                    )
                }
            }
        }
    }
}

@Composable
private fun IraniTeaNavigationDock(selected: Section, onSelect: (Section) -> Unit) {
    val shape = RoundedCornerShape(31.dp)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 7.dp)
            .shadow(
                elevation = 18.dp,
                shape = shape,
                ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = .10f),
                spotColor = MaterialTheme.colorScheme.primary.copy(alpha = .16f),
            ),
        shape = shape,
        color = Color.Transparent,
        border = BorderStroke(1.dp, Color.White.copy(alpha = .92f)),
    ) {
        Row(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFFFFFEFB),
                            Color(0xFFFFF4E4),
                            Color(0xFFFFFEFB),
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
                            if (active) MaterialTheme.colorScheme.secondary.copy(alpha = .18f)
                            else Color.Transparent,
                        )
                        .selectable(
                            selected = active,
                            role = Role.Tab,
                            onClick = { onSelect(item) },
                        )
                        .padding(vertical = 10.dp),
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
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Today at the shop", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                if (fromCache) "Saved snapshot" else LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMMM")),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
            contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = if (cart.isEmpty()) 24.dp else 108.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text("Quick counter", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Tap an item to add it to the order", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            items(data.menu, key = { it.id }) { item ->
                val quantity = cart.firstOrNull { it.item.id == item.id }?.quantity ?: 0
                MenuOrderCard(item, quantity, onAdd, onQuantity)
            }
        }

        if (cart.isNotEmpty()) {
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                tonalElevation = 8.dp,
                shadowElevation = 12.dp,
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        Text("${cart.sumOf { it.quantity }} items", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(money(total), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                    }
                    Button(onClick = { checkoutOpen = true }, enabled = !saving) {
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
        colors = CardDefaults.cardColors(
            containerColor = if (enabled) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${item.category} · ${item.stockQty} in stock", style = MaterialTheme.typography.bodySmall)
                Text(money(item.price), color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
            }
            if (quantity == 0) {
                FilledTonalButton(onClick = { onAdd(item) }, enabled = enabled) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Text(if (enabled) "Add" else "Unavailable")
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { onQuantity(item.id, -1) }) {
                        Icon(Icons.Default.Remove, contentDescription = "Remove one")
                    }
                    Text(quantity.toString(), fontWeight = FontWeight.Bold)
                    IconButton(onClick = { onQuantity(item.id, 1) }, enabled = quantity < item.stockQty) {
                        Icon(Icons.Default.Add, contentDescription = "Add one")
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
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Orders", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Move each order through the kitchen", color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Menu & stock", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Pause sold-out items from the counter", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(menu, key = { it.id }) { item ->
            Card {
                Row(
                    Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(item.name, fontWeight = FontWeight.Bold)
                        Text("${money(item.price)} · ${item.stockQty} in stock", style = MaterialTheme.typography.bodySmall)
                        if (item.stockQty <= item.lowStockThreshold) {
                            Text("Low stock", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Switch(
                        checked = item.isAvailable,
                        onCheckedChange = { onToggle(item) },
                        enabled = !saving,
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
    onExpense: (String, Int, String, () -> Unit) -> Unit,
    onSale: (String, Int, String, String, () -> Unit) -> Unit,
) {
    var expenseOpen by remember { mutableStateOf(false) }
    var saleOpen by remember { mutableStateOf(false) }
    val today = data.transactions.filter { isToday(it.createdAt) }
    val sales = today.filter { it.type == "sale" }.sumOf { it.amount }
    val cashSales = today.filter { it.type == "sale" && it.paymentMode != "online" }.sumOf { it.amount }
    val upiSales = today.filter { it.type == "sale" && it.paymentMode == "online" }.sumOf { it.amount }
    val expenses = today.filter { it.type == "expense" }.sumOf { it.amount }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Column {
                    Text("Sales & expenses", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Today’s cashflow", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
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
                MetricCard("UPI", money(upiSales), Icons.Outlined.Assessment, Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard("Total sales", money(sales), Icons.Default.Payments, Modifier.weight(1f))
                MetricCard("Expenses", money(expenses), Icons.AutoMirrored.Filled.ReceiptLong, Modifier.weight(1f))
            }
        }
        item { SectionTitle("Recent transactions") }
        if (data.transactions.isEmpty()) item { EmptyCard("No sales or expenses recorded yet.") }
        items(data.transactions.take(100), key = { it.id }) { transaction -> TransactionRow(transaction) }
    }

    if (expenseOpen) {
        ExpenseDialog(
            saving = saving,
            onDismiss = { if (!saving) expenseOpen = false },
            onConfirm = { category, amount, note ->
                onExpense(category, amount, note) { expenseOpen = false }
            },
        )
    }

    if (saleOpen) {
        SaleDialog(
            saving = saving,
            onDismiss = { if (!saving) saleOpen = false },
            onConfirm = { category, amount, paymentMode, note ->
                onSale(category, amount, paymentMode, note) { saleOpen = false }
            },
        )
    }
}

@Composable
private fun TransactionRow(transaction: Transaction) {
    Card {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(transaction.category, fontWeight = FontWeight.Bold)
                val paymentLabel = when (transaction.paymentMode) {
                    "online" -> "UPI"
                    else -> "Cash"
                }
                Text(
                    listOfNotNull(
                        paymentLabel.takeIf { transaction.type == "sale" },
                        transaction.note.takeIf { it.isNotBlank() },
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
        }
    }
}

@Composable
private fun ExpenseDialog(
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, Int, String) -> Unit,
) {
    val categories = listOf("Stock", "Milk & tea", "Rent", "Wages", "Gas & electricity", "Other")
    var category by remember { mutableStateOf(categories.first()) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    val amountValue = amount.toIntOrNull() ?: 0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add expense") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                    placeholder = { Text("What was this for?") },
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(category, amountValue, note) },
                enabled = amountValue > 0 && !saving,
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
}

@Composable
private fun SaleDialog(
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, Int, String, String) -> Unit,
) {
    val categories = listOf("Counter sale", "Delivery", "Catering", "Other income")
    var category by remember { mutableStateOf(categories.first()) }
    var amount by remember { mutableStateOf("") }
    var paymentMode by remember { mutableStateOf("cash") }
    var note by remember { mutableStateOf("") }
    val amountValue = amount.toIntOrNull() ?: 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record a sale") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                        Button(onClick = { paymentMode = "online" }, modifier = Modifier.weight(1f)) { Text("UPI") }
                    } else {
                        OutlinedButton(onClick = { paymentMode = "online" }, modifier = Modifier.weight(1f)) { Text("UPI") }
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
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(category, amountValue, paymentMode, note) },
                enabled = amountValue > 0 && !saving,
            ) { Text("Save sale") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") } },
    )
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

private fun isToday(timestamp: String): Boolean = runCatching {
    Instant.parse(timestamp).atZone(ZoneId.of("Asia/Kolkata")).toLocalDate() == LocalDate.now(ZoneId.of("Asia/Kolkata"))
}.getOrDefault(false)
