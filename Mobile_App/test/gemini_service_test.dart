import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/artisera_gemini_service.dart';

void main() {
  test('ArtiseraGeminiService generates real title, description and tags', () async {
    final service = ArtiseraGeminiService();
    final result = await service.generateListingFromVoiceOrText(
      voiceTranscript: 'Handcrafted sandalwood elephant sculpture with intricate jali carving from Mysore',
      existingCategory: 'Woodcraft',
    );

    expect(result, isNotNull);
    expect(result['product_title'], isNotEmpty);
    expect(result['description'], isNotEmpty);
    expect(result['tags'], isA<List>());
    expect((result['tags'] as List).isNotEmpty, isTrue);

    // Verify it is NOT the old generic placeholder
    expect(result['product_title'], isNot(equals('Artisan Handcrafted Product')));
    expect((result['tags'] as List), isNot(contains('Handcrafted In India')));

    // ignore: avoid_print
    print('Generated Title: ${result['product_title']}');
    // ignore: avoid_print
    print('Generated Description: ${result['description']}');
    // ignore: avoid_print
    print('Generated Tags: ${result['tags']}');
  }, timeout: const Timeout(Duration(seconds: 45)));
}
