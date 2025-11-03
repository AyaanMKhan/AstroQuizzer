import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
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

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
      home: const AuthGate(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
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
      return LoginPage(onLogin: onLogin, onSignup: onLogin);
    }
    return MainTabView(userId: userId!, onLogout: onLogout);
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
      final msg = 'Please enter username and password';
      setState(() {
        error = msg;
      });
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
          .post(Uri.parse('http://10.0.2.2:5001/api/login'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(
                  {'username': _userCtrl.text, 'password': _passCtrl.text}))
          .timeout(const Duration(seconds: 10));

      print('doLogin: status=${res.statusCode}, body=${res.body}');
      final j = jsonDecode(res.body);
      if (res.statusCode == 200 && j['id'] != null) {
        widget.onLogin(j['id']);
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Signed in')));
      } else {
        final msg = j['error'] ?? 'Login failed';
        setState(() {
          error = msg;
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      print('doLogin exception: $e');
      setState(() {
        error = 'Network error';
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Network error')));
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  void openSignup() {
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => SignupPage(onSignup: widget.onSignup)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgPrimary,
      body: Center(
        child: Container(
          padding: const EdgeInsets.all(20),
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('AstroQuizzer',
                  style: TextStyle(
                      fontSize: 28,
                      color: textPrimary,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _userCtrl,
                decoration: const InputDecoration(
                    hintText: 'Username',
                    filled: true,
                    fillColor: Color(0xFF020617)),
                style: const TextStyle(color: textPrimary),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                    hintText: 'Password',
                    filled: true,
                    fillColor: Color(0xFF020617)),
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
                      padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Sign in'),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                  onPressed: openSignup,
                  child: const Text('Create account',
                      style: TextStyle(color: textMuted))),
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
    if (_user.text.trim().isEmpty ||
        _pass.text.isEmpty ||
        _first.text.trim().isEmpty ||
        _last.text.trim().isEmpty ||
        _email.text.trim().isEmpty) {
      final msg = 'Please fill all fields';
      setState(() {
        error = msg;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    setState(() {
      loading = true;
      error = '';
    });
    print('doSignup: attempting ${_user.text}');
    try {
      final res = await http
          .post(Uri.parse('http://10.0.2.2:5001/api/register'),
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
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Account created')));
        Navigator.of(context).pop();
      } else {
        final msg = j['error'] ?? 'Signup failed';
        setState(() {
          error = msg;
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      print('doSignup exception: $e');
      setState(() {
        error = 'Network error';
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Network error')));
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgPrimary,
      appBar: AppBar(title: const Text('Create account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
                controller: _first,
                decoration: const InputDecoration(
                    hintText: 'First name',
                    filled: true,
                    fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(
                controller: _last,
                decoration: const InputDecoration(
                    hintText: 'Last name',
                    filled: true,
                    fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(
                controller: _email,
                decoration: const InputDecoration(
                    hintText: 'Email',
                    filled: true,
                    fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(
                controller: _user,
                decoration: const InputDecoration(
                    hintText: 'Username',
                    filled: true,
                    fillColor: Color(0xFF020617))),
            const SizedBox(height: 8),
            TextField(
                controller: _pass,
                obscureText: true,
                decoration: const InputDecoration(
                    hintText: 'Password',
                    filled: true,
                    fillColor: Color(0xFF020617))),
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
                        padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Create account'))),
          ],
        ),
      ),
    );
  }
}

class MainTabView extends StatefulWidget {
  final String userId;
  final VoidCallback onLogout;
  const MainTabView({required this.userId, required this.onLogout, super.key});

  @override
  State<MainTabView> createState() => _MainTabViewState();
}

class _MainTabViewState extends State<MainTabView> {
  int _index = 1; // default to Quiz in middle

  @override
  Widget build(BuildContext context) {
    final pages = [
      LeaderboardPage(userId: widget.userId),
      QuizPage(),
      ProfilePage(userId: widget.userId, onLogout: widget.onLogout)
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('AstroQuizzer')),
      body: pages[_index],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.emoji_events), label: 'Leaderboard'),
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
      final res = await http.post(
          Uri.parse('http://10.0.2.2:5001/api/leaderboard'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'_id': widget.userId}));
      final j = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          top = j['topHundred'] ?? [];
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
    if (error != null)
      return Center(
          child: Text(error!, style: const TextStyle(color: Color(0xFFE33))));
    return Container(
      padding: const EdgeInsets.all(16),
      color: bgPrimary,
      child: Column(
        children: [
          const Text('Leaderboard',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: textPrimary)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: top.length,
              itemBuilder: (context, i) {
                final item = top[i];
                return Card(
                  color: const Color(0xFF020617),
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  child: ListTile(
                    leading: CircleAvatar(
                        backgroundColor: primaryButton,
                        child: Text((i + 1).toString())),
                    title: Text(item['username'] ?? '',
                        style: const TextStyle(color: textPrimary)),
                    trailing: Text('${item['totalScore'] ?? 0}',
                        style: const TextStyle(color: textMuted)),
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

class QuizPage extends StatelessWidget {
  const QuizPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: const [
      Text('Quiz area', style: TextStyle(color: textPrimary, fontSize: 20)),
      SizedBox(height: 8),
      Text('Start a quiz here', style: TextStyle(color: textMuted))
    ]));
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
      final res = await http
          .get(Uri.parse('http://10.0.2.2:5001/api/user/${widget.userId}'));
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
    if (error != null)
      return Center(
          child: Text(error!, style: const TextStyle(color: Color(0xFFE33))));
    if (profile == null)
      return const Center(
          child: Text('No profile', style: TextStyle(color: textMuted)));

    return Container(
      padding: const EdgeInsets.all(16),
      color: bgPrimary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile!['username'] ?? '',
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${profile!['firstName'] ?? ''} ${profile!['lastName'] ?? ''}',
                    style: const TextStyle(color: textMuted),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: widget.onLogout,
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1e293b)),
                child: const Text('Log out'),
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
                      Text('${profile!['totalScore'] ?? 0}',
                          style: const TextStyle(color: textMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Quizzes taken',
                          style: TextStyle(color: textPrimary)),
                      Text('${profile!['quizzesTaken'] ?? 0}',
                          style: const TextStyle(color: textMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Rank', style: TextStyle(color: textPrimary)),
                      Text('${profile!['rank'] ?? '-'}',
                          style: const TextStyle(color: textMuted)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
