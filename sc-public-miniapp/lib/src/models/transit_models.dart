import 'package:flutter/material.dart';

class TransitLine {
  final String title;
  final String line;
  final String status;
  final IconData icon;
  final Color color;

  const TransitLine({
    required this.title,
    required this.line,
    required this.status,
    required this.icon,
    required this.color,
  });
}

class RideRecord {
  final String route;
  final String time;
  final String cost;
  final IconData icon;
  final Color color;

  const RideRecord({
    required this.route,
    required this.time,
    required this.cost,
    required this.icon,
    required this.color,
  });
}
