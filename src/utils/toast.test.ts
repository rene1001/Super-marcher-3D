import test from 'node:test';
import assert from 'node:assert/strict';
import { ToastMessage, ToastType } from '../types/toast';

function createToastHelper(
  type: ToastType,
  title: string,
  message: string,
  duration: number = 3500
): ToastMessage {
  return {
    id: `test_${Date.now()}`,
    type,
    title,
    message,
    duration,
  };
}

function evaluateStockToast(productName: string, requestedQty: number, availableStock: number) {
  if (availableStock <= 0) {
    return {
      canAdd: false,
      toast: createToastHelper(
        'error',
        'Rupture de stock !',
        `Le produit "${productName}" est actuellement épuisé en rayon.`
      ),
    };
  }

  if (requestedQty > availableStock) {
    return {
      canAdd: false,
      toast: createToastHelper(
        'warning',
        'Stock insuffisant',
        `Seulement ${availableStock} unité(s) restante(s) pour "${productName}".`
      ),
    };
  }

  return {
    canAdd: true,
    toast: createToastHelper(
      'success',
      'Ajouté au chariot !',
      `${requestedQty}x "${productName}" ajouté(s) à votre panier.`
    ),
  };
}

test('evaluateStockToast returns success toast when stock is sufficient', () => {
  const result = evaluateStockToast('Baguette Tradition', 2, 10);
  assert.equal(result.canAdd, true);
  assert.equal(result.toast.type, 'success');
  assert.match(result.toast.message, /2x "Baguette Tradition"/);
});

test('evaluateStockToast returns error toast on complete stock rupture', () => {
  const result = evaluateStockToast('Camembert de Normandie', 1, 0);
  assert.equal(result.canAdd, false);
  assert.equal(result.toast.type, 'error');
  assert.match(result.toast.title, /Rupture de stock/);
});

test('evaluateStockToast returns warning toast when requested exceeds available', () => {
  const result = evaluateStockToast('Lait Bio', 5, 2);
  assert.equal(result.canAdd, false);
  assert.equal(result.toast.type, 'warning');
  assert.match(result.toast.title, /Stock insuffisant/);
});
