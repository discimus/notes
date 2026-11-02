let pendingOperations = 0;

export function beginPendingOperation(): () => void {
  pendingOperations += 1;
  let finished = false;

  return () => {
    if (finished) return;
    finished = true;
    pendingOperations = Math.max(0, pendingOperations - 1);
  };
}

export function hasPendingOperations(): boolean {
  return pendingOperations > 0;
}

export async function runPendingOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  const finish = beginPendingOperation();
  try {
    return await operation();
  } finally {
    finish();
  }
}
