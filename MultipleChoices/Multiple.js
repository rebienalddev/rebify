
        // --- LOGIC VARIABLES ---
        let questions = [];
        let currentQuestionIndex = 0;
        let score = 0;
        
        // Common "stop words" to ignore when looking for keywords
        const stopWords = new Set(["the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"]);

        // --- PDF & FILE HANDLING ---
        document.getElementById('navPdfUpload').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            document.getElementById('navFileName').textContent = "Processing...";
            
            if (file.type === "application/pdf") {
                const text = await extractTextFromPDF(file);
                document.getElementById('quizText').value = text;
            } else {
                // Assume text file
                const reader = new FileReader();
                reader.onload = (e) => document.getElementById('quizText').value = e.target.result;
                reader.readAsText(file);
            }
            document.getElementById('navFileName').textContent = file.name.substring(0, 15) + "...";
        });

        async function extractTextFromPDF(file) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }
            return fullText;
        }

        // --- QUIZ GENERATION ALGORITHM (NO AI) ---
        function processAndStartQuiz() {
            const text = document.getElementById('quizText').value.trim();
            const numQ = parseInt(document.getElementById('numQuestions').value);
            
            if (text.length < 50) {
                alert("Please provide more text content (at least 2 sentences) to generate a quiz.");
                return;
            }

            // UI Updates
            document.getElementById('setup-section').style.display = 'none';
            document.getElementById('loading-spinner').style.display = 'block';

            setTimeout(() => {
                generateQuestions(text, numQ);
                if (questions.length === 0) {
                    alert("Could not generate questions. Try pasting cleaner text.");
                    location.reload();
                } else {
                    document.getElementById('loading-spinner').style.display = 'none';
                    document.getElementById('quiz-section').style.display = 'block';
                    renderQuestion();
                }
            }, 1000); // Fake delay for UX
        }

        function generateQuestions(text, maxQuestions) {
            // 1. Clean text and split into sentences
            // Split by . ! ? followed by space or end of string
            let rawSentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            
            // Filter sentences (must have at least 4 words)
            let validSentences = rawSentences.filter(s => s.trim().split(/\s+/).length > 4);
            
            // Get all unique valid words for distractors (wrong answers)
            let allWords = text.match(/\b\w+\b/g).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));
            allWords = [...new Set(allWords)]; // Unique words

            questions = [];
            
            // Shuffle sentences
            validSentences.sort(() => Math.random() - 0.5);

            for (let s of validSentences) {
                if (questions.length >= maxQuestions) break;

                let sentenceWords = s.trim().split(/\s+/);
                
                // Find a candidate word to remove (must be > 3 chars and not a stop word)
                let candidateIndices = sentenceWords.map((w, i) => {
                    let cleanWord = w.replace(/[.,?!]/g, "");
                    return (cleanWord.length > 3 && !stopWords.has(cleanWord.toLowerCase())) ? i : -1;
                }).filter(i => i !== -1);

                if (candidateIndices.length > 0) {
                    // Pick a random word to hide
                    let targetIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
                    let originalWord = sentenceWords[targetIndex];
                    let cleanAnswer = originalWord.replace(/[.,?!]/g, ""); // The correct answer without punctuation

                    // Create the question string with blanks
                    sentenceWords[targetIndex] = "_______";
                    let questionText = sentenceWords.join(" ");

                    // Generate Distractors
                    let options = [cleanAnswer];
                    while (options.length < 4) {
                        let randomWord = allWords[Math.floor(Math.random() * allWords.length)];
                        // Ensure random word isn't the answer and matches capitalization style loosely
                        if (!options.includes(randomWord) && randomWord.toLowerCase() !== cleanAnswer.toLowerCase()) {
                            options.push(randomWord);
                        }
                        // Safety break if not enough words
                        if (allWords.length < 5) break; 
                    }

                    // Shuffle options
                    options.sort(() => Math.random() - 0.5);

                    questions.push({
                        question: questionText,
                        answer: cleanAnswer,
                        options: options
                    });
                }
            }
        }

        // --- QUIZ INTERACTION ---
        function renderQuestion() {
            const q = questions[currentQuestionIndex];
            document.getElementById('q-num').innerText = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
            document.getElementById('question-text').innerText = q.question;
            document.getElementById('next-btn').style.display = 'none';

            const container = document.getElementById('options-container');
            container.innerHTML = ''; // Clear previous

            q.options.forEach(opt => {
                const btn = document.createElement('div');
                btn.className = 'option-btn';
                btn.innerText = opt;
                btn.onclick = () => selectAnswer(btn, opt, q.answer);
                container.appendChild(btn);
            });
        }

        function selectAnswer(btn, selected, correct) {
            // Disable all buttons
            const allBtns = document.querySelectorAll('.option-btn');
            allBtns.forEach(b => b.classList.add('disabled'));

            if (selected.toLowerCase() === correct.toLowerCase()) {
                btn.classList.add('correct');
                score++;
            } else {
                btn.classList.add('wrong');
                // Highlight the correct one
                allBtns.forEach(b => {
                    if (b.innerText.toLowerCase() === correct.toLowerCase()) b.classList.add('correct');
                });
            }

            document.getElementById('score-tracker').innerText = `Score: ${score}`;
            document.getElementById('next-btn').style.display = 'inline-block';
        }

        function nextQuestion() {
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                renderQuestion();
            } else {
                showResults();
            }
        }

        function showResults() {
            document.getElementById('quiz-section').style.display = 'none';
            document.getElementById('results-section').style.display = 'block';
            document.getElementById('final-score').innerText = `${score} / ${questions.length}`;
            
            const percentage = (score / questions.length) * 100;
            let msg = "";
            if(percentage === 100) msg = "Perfect! You're a master!";
            else if(percentage > 70) msg = "Great job! Keep it up.";
            else msg = "Keep studying and try again!";
            
            document.getElementById('feedback-msg').innerText = msg;
        }

        // Sidebar mobile toggle
        document.getElementById('hamburgerBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
