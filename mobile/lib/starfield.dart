import 'dart:math';
import 'dart:ui' show lerpDouble; // for smooth wobble interpolation
import 'package:flutter/material.dart';

/// Chaotic starfield background roughly matching the website effect.
///
/// - Two star layers move at different speeds and directions
/// - Subtle twinkle and wobble
class StarfieldBackground extends StatefulWidget {
  const StarfieldBackground({super.key});

  @override
  State<StarfieldBackground> createState() => _StarfieldBackgroundState();
}

class _StarfieldBackgroundState extends State<StarfieldBackground>
    with TickerProviderStateMixin {
  late final AnimationController _driftA;
  late final AnimationController _driftB;
  late final AnimationController _twinkle;
  late final AnimationController _wobble;

  final _rand = Random();

  // Pre-generate star positions for determinism and performance
  late final List<Offset> _layerA; // far stars (fewer, slower)
  late final List<Offset> _layerB; // near stars (more, faster)

  @override
  void initState() {
    super.initState();
    _driftA = AnimationController(vsync: this, duration: const Duration(seconds: 160))..repeat();
    _driftB = AnimationController(vsync: this, duration: const Duration(seconds: 90))..repeat();
    _twinkle = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat(reverse: true);
    _wobble = AnimationController(vsync: this, duration: const Duration(seconds: 14))..repeat(reverse: true);

    // Densities chosen to be subtle (mobile perf + not too many stars)
    _layerA = _generateStars(60);
    _layerB = _generateStars(120);
  }

  List<Offset> _generateStars(int count) {
    return List.generate(count, (_) => Offset(_rand.nextDouble(), _rand.nextDouble()));
  }

  @override
  void dispose() {
    _driftA.dispose();
    _driftB.dispose();
    _twinkle.dispose();
    _wobble.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: Listenable.merge([_driftA, _driftB, _twinkle, _wobble]),
        builder: (context, _) {
          return CustomPaint(
            painter: _StarfieldPainter(
              tA: _driftA.value,
              tB: _driftB.value,
              twinkle: _twinkle.value,
              wobble: _wobble.value,
              layerA: _layerA,
              layerB: _layerB,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _StarfieldPainter extends CustomPainter {
  final double tA;
  final double tB;
  final double twinkle;
  final double wobble;
  final List<Offset> layerA;
  final List<Offset> layerB;

  _StarfieldPainter({
    required this.tA,
    required this.tB,
    required this.twinkle,
    required this.wobble,
    required this.layerA,
    required this.layerB,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Background base
    final bg = const Color(0xFF0A0E27);
    canvas.drawRect(Offset.zero & size, Paint()..color = bg);

    // Apply subtle wobble transform for chaos
    final wobbleDx = lerpDouble(0, 6, wobble)!;
    final wobbleDy = lerpDouble(0, -8, wobble)!;
    canvas.save();
    canvas.translate(wobbleDx, wobbleDy);

    // Far stars
    _drawLayer(
      canvas,
      size,
      stars: layerA,
      baseAlpha: 0.4,
      radius: 0.9,
      drift: Offset(400 * tA, 800 * tA),
    );

    // Near stars
    _drawLayer(
      canvas,
      size,
      stars: layerB,
      baseAlpha: 0.6,
      radius: 1.1,
      drift: Offset(-500 * tB, 700 * tB),
    );

    canvas.restore();
  }

  void _drawLayer(Canvas canvas, Size size,
      {required List<Offset> stars,
      required double baseAlpha,
      required double radius,
      required Offset drift}) {
    final paint = Paint()..color = Colors.white;

    for (final s in stars) {
      // Convert normalized position to actual, then apply drift and wrap
      double x = (s.dx * size.width + drift.dx) % (size.width + 1);
      double y = (s.dy * size.height + drift.dy) % (size.height + 1);
      if (x < 0) x += size.width;
      if (y < 0) y += size.height;

      final alpha = (baseAlpha + 0.3 * twinkle).clamp(0.2, 0.9);
      paint.color = Colors.white.withOpacity(alpha);
      canvas.drawCircle(Offset(x, y), radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) => true;
}


