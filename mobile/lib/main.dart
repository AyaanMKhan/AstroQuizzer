import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'starfield.dart';
import 'dart:convert';

void main() {
  runApp(const MyApp());
}

// Colors / theme derived from frontend CSS
const Color bgPrimary = Color(0xFF0F172A); // #0f172a
const Color bgSecondary = Color(0xFF0F172A); // reuse
const Color textPrimary = Color(0xFFE2E8F0); // #e2e8f0
const Color textMuted = Color(0xFF94A3B8); // #94a3b8
const Color primaryButton = Color(0xFF2563EB); // #2563eb

// API Base URL
// Use '127.0.0.1' for macOS/iOS (more reliable than localhost)
// Use '10.0.2.2' for Android emulator
const String apiBaseUrl = 'http://127.0.0.1:5001';

final GlobalKey<AuthGateState> authGateKey = GlobalKey<AuthGateState>();
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'AstroQuizzer Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.dark(
          primary: primaryButton,
          surface: bgPrimary,
        ),
        scaffoldBackgroundColor: Colors.black,
        primaryColor: primaryButton,
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: textPrimary),
          bodyMedium: TextStyle(color: textMuted),
        ),
      ),
      builder: (context, child) => Stack(
        children: [
          const Positioned.fill(child: StarfieldBackground()),
          if (child != null) child,
        ],
      ),
      home: AuthGate(key: authGateKey),
      debugShowCheckedModeBanner: false,
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  AuthGateState createState() => AuthGateState();
}

class AuthGateState extends State<AuthGate> {
  bool loggedIn = false;
  String? userId;

  void onLogin(String id) {
    setState(() {
      loggedIn = true;
      userId = id;
    });
  }

  void onLogout() {
    setState(() {
      loggedIn = false;
      userId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!loggedIn) {
      return LoginPage(key: ValueKey('login'), onLogin: onLogin, onSignup: onLogin);
    }
    return MainTabView(key: ValueKey('main_$userId'), userId: userId!, onLogout: onLogout);
  }
}

class LoginPage extends StatefulWidget {
  final void Function(String id) onLogin;
  final void Function(String id) onSignup;
  const LoginPage({required this.onLogin, required this.onSignup, super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String error = '';
  bool loading = false;

  Future<void> doLogin() async {
    if (_userCtrl.text.trim().isEmpty || _passCtrl.text.isEmpty) {
      final msg = 'Please enter email and password';
      setState(() { error = msg; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    setState(() {
      loading = true;
      error = '';
    });

    print('doLogin: attempting login for ${_userCtrl.text}');
    try {
      final res = await http
          .post(Uri.parse('$apiBaseUrl/api/login'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({'email': _userCtrl.text, 'password': _passCtrl.text}))
          .timeout(const Duration(seconds: 10));

      print('doLogin: status=${res.statusCode}, body=${res.body}');
      final j = jsonDecode(res.body);
      if (res.statusCode == 200 && j['id'] != null) {
        widget.onLogin(j['id']);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signed in')));
      } else {
        final msg = j['error'] ?? 'Login failed';
        setState(() { error = msg; });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      print('doLogin exception: $e');
      setState(() { error = 'Network error'; });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
    } finally {
      setState(() { loading = false; });
    }
  }

  void openSignup() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => SignupPage(onSignup: widget.onSignup)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Center(
        child: Container(
          padding: const EdgeInsets.all(20),
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('AstroQuizzer', style: TextStyle(fontSize: 28, color: textPrimary, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _userCtrl,
                decoration: const InputDecoration(hintText: 'Email', filled: true, fillColor: Color(0xFF020617)),
                style: const TextStyle(color: textPrimary),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(hintText: 'Password', filled: true, fillColor: Color(0xFF020617)),
                style: const TextStyle(color: textPrimary),
                onSubmitted: (_) => doLogin(),
              ),
              if (error.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(error, style: const TextStyle(color: Color(0xFFE33))),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: loading ? null : doLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryButton,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: loading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Sign in', style: TextStyle(color: Colors.white)),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(onPressed: openSignup, child: const Text('Create account', style: TextStyle(color: textMuted))),
            ],
          ),
        ),
      ),
    );
  }
}

class SignupPage extends StatefulWidget {
  final void Function(String id) onSignup;
  const SignupPage({required this.onSignup, super.key});

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  String error = '';
  bool loading = false;

  Future<void> doSignup() async {
    if (_user.text.trim().isEmpty || _pass.text.isEmpty || _first.text.trim().isEmpty || _last.text.trim().isEmpty || _email.text.trim().isEmpty) {
      final msg = 'Please fill all fields';
      setState(() { error = msg; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    // Email validation
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegex.hasMatch(_email.text.trim())) {
      final msg = 'Please enter a valid email address';
      setState(() { error = msg; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    // Password length validation
    if (_pass.text.length <= 8) {
      final msg = 'Password must be greater than 8 characters';
      setState(() { error = msg; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    setState(() { loading = true; error = ''; });
    print('doSignup: attempting ${_user.text}');
    try {
      final res = await http
          .post(Uri.parse('$apiBaseUrl/api/register'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'username': _user.text,
                'password': _pass.text,
                'firstName': _first.text,
                'lastName': _last.text,
                'email': _email.text
              }))
          .timeout(const Duration(seconds: 10));
      print('doSignup: status=${res.statusCode}, body=${res.body}');
      final j = jsonDecode(res.body);
      if (res.statusCode == 200 && j['id'] != null) {
        widget.onSignup(j['id']);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created')));
        Navigator.of(context).pop();
      } else {
        final msg = j['error'] ?? 'Signup failed';
        setState(() { error = msg; });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      print('doSignup exception: $e');
      setState(() { error = 'Network error'; });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
    } finally {
      setState(() { loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Create account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: _first, decoration: const InputDecoration(hintText: 'First name', filled: true, fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(controller: _last, decoration: const InputDecoration(hintText: 'Last name', filled: true, fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(controller: _email, decoration: const InputDecoration(hintText: 'Email', filled: true, fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(controller: _user, decoration: const InputDecoration(hintText: 'Username', filled: true, fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(hintText: 'Password', filled: true, fillColor: Color(0xFF020617))),
            if (error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(error, style: const TextStyle(color: Color(0xFFE33))),
            ],
            const SizedBox(height: 12),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                    onPressed: loading ? null : doSignup,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryButton,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: loading 
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                        : const Text('Create account', style: TextStyle(color: Colors.white)))),
          ],
        ),
      ),
    );
  }
}

class MainTabView extends StatefulWidget {
  final String userId;
  final VoidCallback onLogout;
  final int initialIndex;
  const MainTabView({required this.userId, required this.onLogout, this.initialIndex = 1, super.key});

  @override
  State<MainTabView> createState() => _MainTabViewState();
}

class _MainTabViewState extends State<MainTabView> {
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    Widget quizPage = QuizPage(userId: widget.userId);
    final pages = [LeaderboardPage(userId: widget.userId), quizPage, ProfilePage(userId: widget.userId, onLogout: widget.onLogout)];
    return Scaffold(
      appBar: AppBar(title: const Text('AstroQuizzer')),
      body: pages[_index],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.emoji_events), label: 'Leaderboard'),
          BottomNavigationBarItem(icon: Icon(Icons.quiz), label: 'Quiz'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
        backgroundColor: bgPrimary,
        selectedItemColor: primaryButton,
        unselectedItemColor: textMuted,
      ),
    );
  }
}

class LeaderboardPage extends StatefulWidget {
  final String userId;
  const LeaderboardPage({required this.userId, super.key});

  @override
  State<LeaderboardPage> createState() => _LeaderboardPageState();
}

class _LeaderboardPageState extends State<LeaderboardPage> {
  List<dynamic> top = [];
  Map<String, dynamic>? currentUserInfo;
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchLeaderboard();
  }

  Future<void> fetchLeaderboard() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await http.post(Uri.parse('$apiBaseUrl/api/leaderboard'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'_id': widget.userId}));
      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          top = j['topHundred'] ?? [];
          currentUserInfo = j['user'];
        });
      } else {
        setState(() {
          error = j['error'] ?? 'Failed';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Network';
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  bool isCurrentUser(dynamic item) {
    if (currentUserInfo == null) return false;
    // Match by username or _id
    return item['_id'] == widget.userId || item['username'] == currentUserInfo!['username'];
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) return Center(child: Text(error!, style: const TextStyle(color: Color(0xFFE33))));
    return Container(
      padding: const EdgeInsets.all(16),
      color: bgPrimary,
      child: Column(
        children: [
          const Text('Leaderboard', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: top.length,
              itemBuilder: (context, i) {
                final item = top[i];
                final rank = i + 1;
                final isUser = isCurrentUser(item);
                final medal = rank == 1 ? '🥇' : rank == 2 ? '🥈' : rank == 3 ? '🥉' : null;
                return Card(
                  color: isUser ? primaryButton.withOpacity(0.2) : const Color(0xFF020617),
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  child: Container(
                    decoration: isUser
                        ? BoxDecoration(
                            border: Border.all(color: primaryButton, width: 2),
                            borderRadius: BorderRadius.circular(8),
                          )
                        : null,
                  child: ListTile(
                      leading: medal != null
                          ? Text(
                              medal,
                              style: const TextStyle(fontSize: 24),
                            )
                          : CircleAvatar(
                              backgroundColor: isUser ? primaryButton : primaryButton.withOpacity(0.3),
                              child: Text(
                                rank.toString(),
                                style: TextStyle(
                                  color: isUser ? Colors.white : textPrimary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                      title: Text(
                        item['username'] ?? '',
                        style: TextStyle(
                          color: isUser ? primaryButton : textPrimary,
                          fontWeight: isUser ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      trailing: Text(
                        '${item['totalScore'] ?? 0}',
                        style: TextStyle(
                          color: isUser ? primaryButton : textMuted,
                          fontWeight: isUser ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          )
        ],
      ),
    );
  }
}

class QuizPage extends StatefulWidget {
  final String userId;
  const QuizPage({required this.userId, super.key});

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  List<dynamic> questions = [];
  List<int?> answers = [null, null, null, null, null];
  String? error;
  bool loadingQuestions = true;
  bool submitting = false;
  Map<String, dynamic>? userProfile;

  @override
  void initState() {
    super.initState();
    checkUserStatus();
  }

  Future<void> checkUserStatus() async {
    try {
      final res = await http.get(Uri.parse('$apiBaseUrl/api/user/${widget.userId}'));
      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          userProfile = j;
        });
        if (j['dailyQuizCompleted'] == true) {
          // Already completed, navigate to results
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => QuizResultsPage(userId: widget.userId, score: j['currentDaysPoints'] ?? 0))
            );
          });
        } else {
          // Not completed, fetch questions
          fetchQuestions();
        }
      } else {
        setState(() {
          error = j['error'] ?? 'Failed to load user';
          loadingQuestions = false;
        });
      }
    } catch (e) {
      setState(() {
        error = 'Network error';
        loadingQuestions = false;
      });
    }
  }

  Future<void> fetchQuestions() async {
    setState(() {
      loadingQuestions = true;
      error = null;
    });
    try {
      final res = await http.get(Uri.parse('$apiBaseUrl/api/questions/today'));
      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          questions = j['questions'] ?? [];
          loadingQuestions = false;
        });
      } else {
        setState(() {
          error = j['error'] ?? 'Failed to load questions';
          loadingQuestions = false;
        });
      }
    } catch (e) {
      setState(() {
        error = 'Network error';
        loadingQuestions = false;
      });
    }
  }

  Color getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return Colors.green;
      case 'medium':
        return Colors.yellow;
      case 'hard':
        return Colors.red;
      default:
        return textMuted;
    }
  }

  bool get canSubmit => answers.every((a) => a != null) && !submitting;

  Future<void> submitQuiz() async {
    if (!canSubmit) return;

    setState(() {
      submitting = true;
    });

    try {
      final res = await http.post(
        Uri.parse('$apiBaseUrl/api/quiz/submit'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': widget.userId,
          'answers': answers
        })
      );

      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        // Show loading while updating total score (simulated delay)
        await Future.delayed(const Duration(milliseconds: 500));

        // Prepare in-memory review payload
        final reviewQuestions = List<Map<String, dynamic>>.from(questions);
        final results = (j['results'] as List).cast<Map>();

        // Optionally clear local state
        answers = [null, null, null, null, null];
        questions = [];

        // Navigate to results with review data in memory
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => QuizResultsPage(
              userId: widget.userId,
              score: j['score'] ?? 0,
              questionsForReview: reviewQuestions,
              resultsForReview: results,
            )
          )
        );
      } else {
        setState(() {
          error = j['error'] ?? 'Failed to submit quiz';
          submitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error!)));
      }
    } catch (e) {
      setState(() {
        error = 'Network error';
        submitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loadingQuestions || submitting) {
      return const Center(child: CircularProgressIndicator());
    }

    if (error != null && questions.isEmpty) {
    return Center(
        child: Column(
            mainAxisSize: MainAxisSize.min,
          children: [
            Text(error!, style: const TextStyle(color: Color(0xFFE33))),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: fetchQuestions,
              child: const Text('Retry'),
            )
          ],
        ),
      );
    }

    if (questions.isEmpty) {
      return const Center(child: Text('No questions available', style: TextStyle(color: textMuted)));
    }

    return Container(
      padding: const EdgeInsets.all(16),
      color: bgPrimary,
      child: Column(
        children: [
          const Text('Daily Quiz', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: List.generate(questions.length, (index) {
                  final q = questions[index];
                  final diffColor = getDifficultyColor(q['difficulty']);
                  return Card(
                    color: const Color(0xFF020617),
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: diffColor.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: diffColor),
                                ),
                                child: Text(
                                  q['difficulty'].toUpperCase(),
                                  style: TextStyle(color: diffColor, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                              Text(
                                '${q['points']} pts',
                                style: TextStyle(color: diffColor, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${index + 1}. ${q['question']}',
                            style: const TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 12),
                          ...List.generate(4, (optIndex) {
                            return RadioListTile<int>(
                              title: Text(
                                q['options'][optIndex],
                                style: TextStyle(
                                  color: answers[index] == optIndex ? textPrimary : textMuted,
                                ),
                              ),
                              value: optIndex,
                              groupValue: answers[index],
                              onChanged: (value) {
                                setState(() {
                                  answers[index] = value;
                                });
                              },
                              activeColor: primaryButton,
                            );
                          }),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canSubmit ? submitQuiz : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryButton,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: submitting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit Quiz', style: TextStyle(color: Colors.white)),
            ),
          ),
          if (error != null && !submitting) ...[
            const SizedBox(height: 8),
            Text(error!, style: const TextStyle(color: Color(0xFFE33))),
          ],
        ],
      ),
    );
  }
}

class QuizResultsPage extends StatelessWidget {
  final String userId;
  final int score;
  final List<Map<String, dynamic>>? questionsForReview;
  final List<Map>? resultsForReview;
  
  const QuizResultsPage({
    required this.userId,
    required this.score,
    this.questionsForReview,
    this.resultsForReview,
    super.key
  });

  @override
  Widget build(BuildContext context) {
    final canReview = questionsForReview != null &&
        resultsForReview != null &&
        questionsForReview!.length == 5 &&
        resultsForReview!.length == 5;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Quiz Results')),
      body: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Daily Quiz Complete!',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: textPrimary),
            ),
            const SizedBox(height: 32),
            Text(
              '$score / 9',
              style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: primaryButton),
            ),
            const SizedBox(height: 8),
            const Text(
              'points earned',
              style: TextStyle(fontSize: 18, color: textMuted),
            ),
            const SizedBox(height: 32),
            if (canReview)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => QuizReviewPage(
                          questions: questionsForReview!,
                          results: resultsForReview!,
                        ),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: primaryButton, width: 1.5),
                    foregroundColor: primaryButton,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Review my answers'),
                ),
              ),
            if (canReview) const SizedBox(height: 24),
            InkWell(
              onTap: () async {
                final uri = Uri.parse('https://astroquizzer.xyz/');
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: primaryButton, width: 1.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.open_in_new, color: primaryButton, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Learn more about today\'s topic',
                      style: TextStyle(
                        color: primaryButton,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (_) => MainTabView(
                        userId: userId,
                        onLogout: () {},
                        initialIndex: 0, // Leaderboard tab
                      ),
                    ),
                    (route) => false,
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryButton,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('View Leaderboard', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class QuizReviewPage extends StatelessWidget {
  final List<Map<String, dynamic>> questions;
  final List<Map> results; // { questionIndex, userAnswer, correctAnswer, isCorrect }

  const QuizReviewPage({
    super.key,
    required this.questions,
    required this.results,
  });

  Color colorFor(int idx, int correct, int user, bool isCorrect) {
    if (idx == correct) return const Color(0xFF22c55e); // green
    if (!isCorrect && idx == user) return const Color(0xFFef4444); // red
    return textMuted;
  }

  FontWeight weightFor(int idx, int correct, int user, bool isCorrect) {
    if (idx == correct) return FontWeight.w700;
    if (!isCorrect && idx == user) return FontWeight.w600;
    return FontWeight.w400;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Review Answers')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: questions.length,
        itemBuilder: (context, i) {
          final q = questions[i];
          final r = results[i];
          final correct = (r['correctAnswer'] as num).toInt();
          final user = (r['userAnswer'] as num).toInt();
          final isCorrect = (r['isCorrect'] as bool);
          return Card(
            color: const Color(0xFF020617),
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${i + 1}. ${q['question']}',
                    style: const TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 10),
                  for (int idx = 0; idx < 4; idx++)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: colorFor(idx, correct, user, isCorrect).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: colorFor(idx, correct, user, isCorrect)),
                      ),
                      child: Text(
                        q['options'][idx],
                        style: TextStyle(
                          color: colorFor(idx, correct, user, isCorrect),
                          fontWeight: weightFor(idx, correct, user, isCorrect),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class ProfilePage extends StatefulWidget {
  final String userId;
  final VoidCallback onLogout;
  const ProfilePage({required this.userId, required this.onLogout, super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? profile;
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchProfile();
  }

  Future<void> fetchProfile() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await http.get(Uri.parse('$apiBaseUrl/api/user/${widget.userId}'));
      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          profile = j;
        });
      } else {
        setState(() {
          error = j['error'] ?? 'Failed';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Network';
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) return Center(child: Text(error!, style: const TextStyle(color: Color(0xFFE33))));
    if (profile == null) return const Center(child: Text('No profile', style: TextStyle(color: textMuted)));

    return Container(
      padding: const EdgeInsets.all(16),
      color: bgPrimary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile!['username'] ?? '',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${profile!['firstName'] ?? ''} ${profile!['lastName'] ?? ''}',
                    style: const TextStyle(color: textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            color: const Color(0xFF020617),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Score', style: TextStyle(color: textPrimary)),
                      Text('${profile!['totalScore'] ?? 0}', style: const TextStyle(color: textMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Quizzes taken', style: TextStyle(color: textPrimary)),
                      Text('${profile!['quizzesTaken'] ?? 0}', style: const TextStyle(color: textMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Rank', style: TextStyle(color: textPrimary)),
                      Text('${profile!['rank'] ?? '-'}', style: const TextStyle(color: textMuted)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: () async {
              final uri = Uri.parse('https://astroquizzer.xyz/');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: primaryButton, width: 1.5),
                borderRadius: BorderRadius.circular(8),
                color: const Color(0xFF020617),
              ),
              child: Row(
                children: [
                  Icon(Icons.settings, color: primaryButton, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Change your settings',
                          style: TextStyle(
                            color: primaryButton,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'This can only be done on the website',
                          style: TextStyle(
                            color: textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.open_in_new, color: primaryButton, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
