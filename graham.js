/* =====================================================
   Graham Scan Algorithm — Core Logic & Step Generation
   =====================================================
   
   COORDINATE SYSTEM NOTE:
   Canvas uses screen coordinates where Y increases DOWNWARD.
   The "lowest point" visually is the one with the LARGEST y value.
   
   We work entirely in screen coordinates and adjust the 
   orientation logic accordingly:
   - In screen coords, cross product > 0 means CLOCKWISE (right turn)
   - In screen coords, cross product < 0 means COUNTER-CLOCKWISE (left turn)
   
   For Graham Scan we need to walk CCW, so we keep points that
   produce a NEGATIVE cross product (left turn in screen coords)
   and pop on positive (right turn) or zero (collinear).
*/

/**
 * Computes the cross product of vectors OA and OB.
 * In screen coordinates (Y-down):
 *   Positive = clockwise turn (right turn visually)
 *   Negative = counter-clockwise turn (left turn visually)
 *   Zero = collinear
 */
function crossProduct(O, A, B) {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

/**
 * Computes the polar angle of point relative to pivot using atan2.
 * In screen coordinates, Y is inverted so we negate dy to get 
 * mathematical angles that sort CCW visually.
 */
function polarAngle(pivot, point) {
  return Math.atan2(-(point.y - pivot.y), point.x - pivot.x);
}

/**
 * Squared distance between two points.
 */
function distSq(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/**
 * Step types for the visualization
 */
const StepType = {
  FIND_PIVOT: 'find_pivot',
  SORT_POINTS: 'sort_points',
  INIT_STACK: 'init_stack',
  CONSIDER_POINT: 'consider_point',
  CHECK_ORIENTATION: 'check_orientation',
  POP_STACK: 'pop_stack',
  PUSH_STACK: 'push_stack',
  COMPLETE: 'complete',
};

/**
 * Generates all visualization steps for the Graham Scan algorithm.
 * 
 * @param {Array<{x: number, y: number, id: number}>} inputPoints
 * @returns {Array<Object>} steps - Array of step objects for visualization
 */
function generateGrahamScanSteps(inputPoints) {
  // --- Edge case: fewer than 3 points ---
  if (inputPoints.length < 3) {
    return [{
      type: StepType.COMPLETE,
      title: 'Not Enough Points',
      description: 'At least 3 points are needed to form a convex hull.',
      hull: [],
      points: inputPoints.map(p => ({ ...p, state: 'unprocessed' })),
      lines: [],
      pseudocodeLine: null,
      badge: 'finished',
    }];
  }

  // --- Remove exact duplicate points ---
  const seen = new Set();
  const dedupedInput = [];
  for (const p of inputPoints) {
    const key = `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedInput.push(p);
    }
  }

  if (dedupedInput.length < 3) {
    return [{
      type: StepType.COMPLETE,
      title: 'Not Enough Unique Points',
      description: 'After removing duplicates, fewer than 3 unique points remain.',
      hull: [],
      points: inputPoints.map(p => ({ ...p, state: 'unprocessed' })),
      lines: [],
      pseudocodeLine: null,
      badge: 'finished',
    }];
  }

  const steps = [];
  const points = dedupedInput.map(p => ({ ...p }));

  // ====================================================================
  // Step 1: Find the pivot — lowest point visually = largest Y in canvas
  //         Tie-break: smallest X (leftmost)
  // ====================================================================
  let pivotIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y > points[pivotIdx].y ||
        (points[i].y === points[pivotIdx].y && points[i].x < points[pivotIdx].x)) {
      pivotIdx = i;
    }
  }

  // Swap pivot to index 0
  [points[0], points[pivotIdx]] = [points[pivotIdx], points[0]];
  const pivot = points[0];

  console.log('[Graham] Pivot:', `P${pivot.id}`, `(${pivot.x.toFixed(1)}, ${pivot.y.toFixed(1)})`);

  steps.push({
    type: StepType.FIND_PIVOT,
    title: 'Finding the Pivot Point',
    description: `The pivot is the bottommost point on screen (largest y-coordinate = ${Math.round(pivot.y)}). ` +
      `This is P${pivot.id} at (${Math.round(pivot.x)}, ${Math.round(pivot.y)}). Ties broken by leftmost x.`,
    points: points.map(p => ({
      ...p,
      state: p.id === pivot.id ? 'pivot' : 'unprocessed',
    })),
    hull: [],
    stack: [pivot],
    lines: [],
    pivotId: pivot.id,
    pseudocodeLine: [3, 4],
    badge: 'running',
  });

  // ====================================================================
  // Step 2: Sort remaining points by polar angle relative to pivot
  //         Using atan2 with negated dy so angles go CCW visually
  // ====================================================================
  const rest = points.slice(1);

  const angleInfo = rest.map(p => ({
    point: p,
    angle: polarAngle(pivot, p),
    dist: distSq(pivot, p),
  }));

  // Sort by angle ascending; tie-break by distance ascending (nearest first)
  angleInfo.sort((a, b) => {
    const angleDiff = a.angle - b.angle;
    if (Math.abs(angleDiff) > 1e-10) {
      return angleDiff;
    }
    return a.dist - b.dist;
  });

  // Remove collinear (same-angle) points — keep only the farthest
  const filtered = [];
  for (let i = 0; i < angleInfo.length; i++) {
    // If the next point has the same angle, skip this one (it's closer)
    if (i < angleInfo.length - 1 &&
        Math.abs(angleInfo[i].angle - angleInfo[i + 1].angle) < 1e-10) {
      continue;
    }
    filtered.push(angleInfo[i].point);
  }

  console.log('[Graham] Sorted points (by angle):',
    filtered.map(p => `P${p.id}(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(', '));

  // Build full sorted array: pivot + sorted rest
  const sortedPoints = [pivot, ...filtered];

  if (sortedPoints.length < 3) {
    steps.push({
      type: StepType.COMPLETE,
      title: 'All Points Are Collinear',
      description: 'After removing collinear duplicates, fewer than 3 distinct-angle points remain. No polygon can be formed.',
      hull: sortedPoints,
      points: sortedPoints.map(p => ({ ...p, state: 'hull' })),
      lines: sortedPoints.length >= 2 ? [{
        from: sortedPoints[0],
        to: sortedPoints[sortedPoints.length - 1],
        type: 'hull-line',
      }] : [],
      pseudocodeLine: [17],
      badge: 'finished',
    });
    return steps;
  }

  // Create angle lines for visualization
  const angleLines = filtered.map((p, i) => ({
    from: pivot,
    to: p,
    type: 'angle-line',
    order: i,
  }));

  steps.push({
    type: StepType.SORT_POINTS,
    title: 'Sorting by Polar Angle',
    description: `${filtered.length} points sorted by polar angle relative to pivot P${pivot.id}. ` +
      `Points are ordered counter-clockwise.` +
      (angleInfo.length - filtered.length > 0
        ? ` ${angleInfo.length - filtered.length} collinear point(s) removed (keeping farthest).`
        : ''),
    points: sortedPoints.map((p, i) => ({
      ...p,
      state: p.id === pivot.id ? 'pivot' : 'unprocessed',
      sortOrder: i,
    })),
    hull: [],
    stack: [pivot],
    lines: angleLines,
    pivotId: pivot.id,
    pseudocodeLine: [7],
    badge: 'running',
  });

  // ====================================================================
  // Step 3: Initialize stack with pivot + first sorted point
  // ====================================================================
  const stack = [sortedPoints[0], sortedPoints[1]];

  steps.push({
    type: StepType.INIT_STACK,
    title: 'Initializing the Stack',
    description: `Push pivot P${sortedPoints[0].id} and first sorted point P${sortedPoints[1].id} onto the stack.`,
    points: sortedPoints.map((p, i) => ({
      ...p,
      state: i === 0 ? 'pivot' : i === 1 ? 'hull' : 'unprocessed',
    })),
    hull: [...stack],
    stack: [...stack],
    lines: [{
      from: stack[0],
      to: stack[1],
      type: 'hull-line',
    }],
    pivotId: pivot.id,
    pseudocodeLine: [10],
    badge: 'running',
  });

  // ====================================================================
  // Step 4: Process each remaining sorted point
  //
  // KEY INSIGHT for screen coordinates (Y-down):
  //   crossProduct(O, A, B) > 0  →  clockwise (RIGHT turn)    → must POP
  //   crossProduct(O, A, B) < 0  →  counter-clockwise (LEFT)  → KEEP
  //   crossProduct(O, A, B) = 0  →  collinear                 → POP
  //
  //   We pop while cross product >= 0 (not a left turn).
  // ====================================================================
  const rejectedIds = new Set();

  for (let i = 2; i < sortedPoints.length; i++) {
    const current = sortedPoints[i];

    // --- Step: Consider this point ---
    steps.push({
      type: StepType.CONSIDER_POINT,
      title: `Considering Point P${current.id}`,
      description: `Examining P${current.id} at (${Math.round(current.x)}, ${Math.round(current.y)}). ` +
        `Check if adding it keeps the hull convex.`,
      points: buildPointStates(sortedPoints, pivot, current, stack, rejectedIds),
      hull: [...stack],
      stack: [...stack],
      currentPoint: current,
      lines: buildHullLines(stack, current),
      pivotId: pivot.id,
      pseudocodeLine: [12],
      badge: 'running',
      currentIdx: i,
      totalPoints: sortedPoints.length,
    });

    // --- Orientation checks & pops ---
    while (stack.length > 1) {
      const top = stack[stack.length - 1];
      const top2 = stack[stack.length - 2];
      const cp = crossProduct(top2, top, current);

      // In screen coords: cp > 0 is CW (right turn), cp < 0 is CCW (left turn)
      const isLeftTurn = cp < 0;
      const isCollinear = Math.abs(cp) < 1e-10;

      let turnLabel, turnDescription;
      if (isCollinear) {
        turnLabel = 'Collinear —';
        turnDescription = `P${top2.id} → P${top.id} → P${current.id} are COLLINEAR. ` +
          `P${top.id} is removed (keeping the farthest).`;
      } else if (isLeftTurn) {
        turnLabel = 'Left Turn (CCW) ✓';
        turnDescription = `P${top2.id} → P${top.id} → P${current.id} make a LEFT TURN. ` +
          `P${top.id} stays — the hull remains convex.`;
      } else {
        turnLabel = 'Right Turn (CW) ✗';
        turnDescription = `P${top2.id} → P${top.id} → P${current.id} make a RIGHT TURN. ` +
          `P${top.id} creates a concavity and must be removed.`;
      }

      console.log(`[Graham] Orientation P${top2.id}→P${top.id}→P${current.id}: cp=${cp.toFixed(2)} → ${turnLabel}`);

      steps.push({
        type: StepType.CHECK_ORIENTATION,
        title: 'Orientation Check',
        description: turnDescription,
        points: buildPointStates(sortedPoints, pivot, current, stack, rejectedIds),
        hull: [...stack],
        stack: [...stack],
        currentPoint: current,
        checkPoints: { a: top2, b: top, c: current },
        crossProductValue: cp,
        turnType: isCollinear ? 'collinear' : isLeftTurn ? 'left' : 'right',
        turnLabel,
        lines: buildOrientationLines(stack, current, top2, top),
        pivotId: pivot.id,
        pseudocodeLine: [13],
        badge: isLeftTurn ? 'running' : 'pop',
      });

      // If LEFT TURN → stop popping, this point is good
      if (isLeftTurn) {
        break;
      }

      // RIGHT TURN or COLLINEAR → pop the top
      const popped = stack.pop();
      rejectedIds.add(popped.id);

      console.log(`[Graham] Popped P${popped.id}, stack size: ${stack.length}`);

      steps.push({
        type: StepType.POP_STACK,
        title: `Pop: Removing P${popped.id}`,
        description: `P${popped.id} removed from hull — it caused a ` +
          `${isCollinear ? 'collinear section' : 'right turn (concavity)'}. ` +
          `Stack: ${stack.length} points.`,
        points: buildPointStates(sortedPoints, pivot, current, stack, rejectedIds, popped),
        hull: [...stack],
        stack: [...stack],
        currentPoint: current,
        poppedPoint: popped,
        lines: buildHullLines(stack, current),
        pivotId: pivot.id,
        pseudocodeLine: [14],
        badge: 'pop',
      });
    }

    // --- Push current point onto stack ---
    stack.push(current);

    console.log(`[Graham] Pushed P${current.id}, stack: [${stack.map(s => 'P' + s.id).join(', ')}]`);

    steps.push({
      type: StepType.PUSH_STACK,
      title: `Push: Adding P${current.id}`,
      description: `P${current.id} added to the hull. Stack now has ${stack.length} points: ` +
        `[${stack.map(s => 'P' + s.id).join(', ')}]`,
      points: buildPointStates(sortedPoints, pivot, null, stack, rejectedIds),
      hull: [...stack],
      stack: [...stack],
      lines: buildHullLines(stack, null),
      pivotId: pivot.id,
      pseudocodeLine: [15],
      badge: 'running',
    });
  }

  // ====================================================================
  // Step 5: Complete — close the hull polygon
  // ====================================================================
  const finalHullLines = [];
  for (let i = 0; i < stack.length; i++) {
    finalHullLines.push({
      from: stack[i],
      to: stack[(i + 1) % stack.length],
      type: 'hull-line',
    });
  }

  console.log(`[Graham] COMPLETE. Hull: [${stack.map(s => 'P' + s.id).join(', ')}] (${stack.length} vertices)`);

  steps.push({
    type: StepType.COMPLETE,
    title: 'Convex Hull Complete! 🎉',
    description: `The convex hull has ${stack.length} vertices: ` +
      `[${stack.map(s => 'P' + s.id).join(', ')}]. ` +
      `It encloses all ${sortedPoints.length} points.`,
    points: sortedPoints.map(p => ({
      ...p,
      state: stack.some(s => s.id === p.id) ? 'hull'
        : rejectedIds.has(p.id) ? 'rejected'
        : 'unprocessed',
    })),
    hull: [...stack],
    stack: [...stack],
    lines: finalHullLines,
    pivotId: pivot.id,
    pseudocodeLine: [17],
    badge: 'finished',
  });

  return steps;
}

// ====================================================================
// Helper: Build point states array for a step
// ====================================================================
function buildPointStates(sortedPoints, pivot, currentPoint, stack, rejectedIds, poppedPoint) {
  return sortedPoints.map(p => ({
    ...p,
    state: (poppedPoint && p.id === poppedPoint.id) ? 'rejected'
      : p.id === pivot.id ? 'pivot'
      : (currentPoint && p.id === currentPoint.id) ? 'current'
      : stack.some(s => s.id === p.id) ? 'hull'
      : rejectedIds.has(p.id) ? 'rejected'
      : 'unprocessed',
  }));
}

// ====================================================================
// Helper: Build hull edge lines + optional candidate check line
// ====================================================================
function buildHullLines(stack, candidatePoint) {
  const lines = [];

  for (let i = 0; i < stack.length - 1; i++) {
    lines.push({
      from: stack[i],
      to: stack[i + 1],
      type: 'hull-line',
    });
  }

  if (candidatePoint && stack.length > 0) {
    lines.push({
      from: stack[stack.length - 1],
      to: candidatePoint,
      type: 'check-line',
    });
  }

  return lines;
}

// ====================================================================
// Helper: Build orientation check lines
// ====================================================================
function buildOrientationLines(stack, candidatePoint, a, b) {
  const lines = [];

  // Hull edges (excluding the last one since that's being checked)
  for (let i = 0; i < stack.length - 1; i++) {
    lines.push({
      from: stack[i],
      to: stack[i + 1],
      type: 'hull-line',
    });
  }

  // The two edges forming the angle being checked
  lines.push({
    from: a,
    to: b,
    type: 'orientation-a',
  });

  lines.push({
    from: b,
    to: candidatePoint,
    type: 'orientation-b',
  });

  return lines;
}

// ====================================================================
// Export
// ====================================================================
window.GrahamScan = {
  generateSteps: generateGrahamScanSteps,
  crossProduct,
  polarAngle,
  StepType,
};
