package com.fintech.vendor.spa

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.graphics.Color
import android.view.Gravity

/**
 * SpaBookingActivity - Entry point for the Spa & Wellness Native Mini App.
 *
 * Launched directly by the Super App host via The Universal Native Mini App Launcher:
 *   MethodChannel("superapp/native_launcher").invokeMethod("launch", mapOf(
 *       "entryClass" to "com.fintech.vendor.spa.SpaBookingActivity",
 *       "userId" to userId,
 *       "authToken" to token,
 *       "params" to mapOf("tier" to "VIP")
 *   ))
 */
class SpaBookingActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val userId = intent.getStringExtra("EXTRA_USER_ID") ?: "Guest"
        val authToken = intent.getStringExtra("EXTRA_AUTH_TOKEN")
        val serviceTier = intent.getStringExtra("tier") ?: "Standard"

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 64, 48, 64)
            gravity = Gravity.CENTER_HORIZONTAL
            setBackgroundColor(Color.parseColor("#F8FAFC"))
        }

        val headerText = TextView(this).apply {
            text = "🌿 Lotus Spa & Wellness"
            textSize = 24f
            setTextColor(Color.parseColor("#0F172A"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }

        val statusBadge = TextView(this).apply {
            text = "Verified Native SDK Mini App"
            textSize = 12f
            setTextColor(Color.parseColor("#0284C7"))
            setBackgroundColor(Color.parseColor("#E0F2FE"))
            setPadding(24, 8, 24, 8)
            gravity = Gravity.CENTER
        }

        val userLabel = TextView(this).apply {
            text = "\nActive User: $userId\nMembership Tier: $serviceTier\nAuth Status: ${if (authToken != null) "Authenticated" else "Anonymous"}"
            textSize = 14f
            setTextColor(Color.parseColor("#334155"))
            setPadding(0, 32, 0, 32)
            gravity = Gravity.CENTER
        }

        val bookButton = Button(this).apply {
            text = "Confirm Reservation ($serviceTier Package)"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#0EA5E9"))
            setOnClickListener {
                Toast.makeText(this@SpaBookingActivity, "Spa booking confirmed for $userId!", Toast.LENGTH_SHORT).show()
                finish()
            }
        }

        val backButton = Button(this).apply {
            text = "Return to Super App"
            setTextColor(Color.parseColor("#475569"))
            setBackgroundColor(Color.parseColor("#E2E8F0"))
            setOnClickListener {
                finish()
            }
        }

        layout.addView(headerText)
        layout.addView(statusBadge)
        layout.addView(userLabel)
        layout.addView(bookButton)
        layout.addView(backButton)

        setContentView(layout)
    }
}
