import { NextResponse } from "next/server";

// In-memory transaction log (resets on restart)
const transactions = [];
let transactionCounter = 1000;

export async function POST(request) {
  // ============================================================
  // INTENTIONALLY VULNERABLE:
  // - No CSRF token validation
  // - No nonce checking
  // - No timestamp validation
  // - No replay protection — identical requests succeed every time
  // - Only checks for session cookie existence
  // ============================================================

  // Check for session cookie
  const cookies = request.headers.get("cookie") || "";
  const sessionMatch = cookies.match(/session_token=([^;]+)/);

  if (!sessionMatch) {
    return NextResponse.json(
      { error: "Unauthorized — no session token. Please login first." },
      { status: 401 }
    );
  }

  const sessionToken = sessionMatch[1];

  try {
    const body = await request.json();
    const { to, amount } = body;

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing 'to' and 'amount' fields" },
        { status: 400 }
      );
    }

    if (amount <= 0 || amount > 10000) {
      return NextResponse.json(
        { error: "Amount must be between $1 and $10,000" },
        { status: 400 }
      );
    }

    // Process the transfer (no duplicate/replay checking!)
    transactionCounter++;
    const transaction = {
      id: `TXN-${transactionCounter}`,
      from: "admin",
      to: to,
      amount: Number(amount),
      timestamp: new Date().toISOString(),
      session: sessionToken,
    };

    transactions.push(transaction);

    return NextResponse.json({
      status: "success",
      message: `Transfer of $${amount} to ${to} completed successfully`,
      transaction: transaction,
      totalTransactions: transactions.length,
      warning_for_workshop:
        "Notice: No CSRF token, no nonce, no replay protection!",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// GET endpoint to see all transactions (for demonstration)
export async function GET(request) {
  const cookies = request.headers.get("cookie") || "";
  const sessionMatch = cookies.match(/session_token=([^;]+)/);

  if (!sessionMatch) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    transactions: transactions,
    total: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
  });
}
