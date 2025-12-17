     // --- LOGIC VARIABLES ---
        let questions = [];
        let currentQuestionIndex = 0;
        let score = 0;
        
        // Words to ignore
        const stopWords = new Set(["the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"]);

        // --- PDF HANDLING ---
        document.getElementById('navPdfUpload').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('navFileName').textContent = "Processing...";
            if (file.type === "application/pdf") {
                const text = await extractTextFromPDF(file);
                document.getElementById('quizText').value = text;
            } else {
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
                fullText += textContent.items.map(item => item.str).join(" ") + "\n";
            }
            return fullText;
        }

        // --- IDENTIFICATION ALGORITHM WITH DIFFICULTY ---
        function processAndStartQuiz() {
            const text = document.getElementById('quizText').value.trim();
            const numQ = parseInt(document.getElementById('numQuestions').value);
            const difficulty = document.getElementById('difficulty').value;
            
            if (text.length < 50) {
                alert("Please provide more text content.");
                return;
            }

            document.getElementById('setup-section').style.display = 'none';
            document.getElementById('loading-spinner').style.display = 'block';

            setTimeout(() => {
                generateQuestions(text, numQ, difficulty);
                if (questions.length === 0) {
                    alert("Could not generate questions. Try pasting cleaner text.");
                    location.reload();
                } else {
                    document.getElementById('loading-spinner').style.display = 'none';
                    document.getElementById('quiz-section').style.display = 'block';
                    renderQuestion();
                }
            }, 1000);
        }

        function generateQuestions(text, maxQuestions, difficulty) {
            let rawSentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            let validSentences = rawSentences.filter(s => s.trim().split(/\s+/).length > 4);
            
            questions = [];
            validSentences.sort(() => Math.random() - 0.5);

            // Determine word length based on difficulty
            let minLen = 4;
            if (difficulty === "Medium") minLen = 5;
            if (difficulty === "Hard") minLen = 7;

            for (let s of validSentences) {
                if (questions.length >= maxQuestions) break;

                let sentenceWords = s.trim().split(/\s+/);
                
                // Find candidates
                let candidateIndices = sentenceWords.map((w, i) => {
                    let cleanWord = w.replace(/[.,?!()"']/g, "");
                    return (cleanWord.length >= minLen && !stopWords.has(cleanWord.toLowerCase())) ? i : -1;
                }).filter(i => i !== -1);

                // Fallback for Hard: if no long words found, look for shorter ones
                if (candidateIndices.length === 0 && minLen > 4) {
                    candidateIndices = sentenceWords.map((w, i) => {
                        let cleanWord = w.replace(/[.,?!()"']/g, "");
                        return (cleanWord.length >= 4 && !stopWords.has(cleanWord.toLowerCase())) ? i : -1;
                    }).filter(i => i !== -1);
                }

                if (candidateIndices.length > 0) {
                    let targetIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
                    let originalWord = sentenceWords[targetIndex];
                    let cleanAnswer = originalWord.replace(/[.,?!()"']/g, ""); 

                    sentenceWords[targetIndex] = "___________"; 
                    let questionText = sentenceWords.join(" ");

                    questions.push({
                        question: questionText,
                        answer: cleanAnswer
                    });
                }
            }
        }

        // --- INTERACTION ---
        function renderQuestion() {
            const q = questions[currentQuestionIndex];
            document.getElementById('q-num').innerText = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
            document.getElementById('question-text').innerText = q.question;
            
            const input = document.getElementById('userAnswer');
            input.value = "";
            input.disabled = false;
            input.classList.remove('correct', 'wrong');
            input.focus();

            document.getElementById('feedback-text').innerText = "";
            document.getElementById('submitAnswerBtn').style.display = 'inline-block';
            document.getElementById('next-btn').style.display = 'none';
        }

        function checkAnswer() {
            const input = document.getElementById('userAnswer');
            const userVal = input.value.trim().toLowerCase();
            const correctVal = questions[currentQuestionIndex].answer.toLowerCase();
            const feedback = document.getElementById('feedback-text');

            if (userVal === "") return;

            input.disabled = true;
            document.getElementById('submitAnswerBtn').style.display = 'none';
            document.getElementById('next-btn').style.display = 'inline-block';

            if (userVal === correctVal) {
                input.classList.add('correct');
                feedback.style.color = "#28a745";
                feedback.innerText = "Correct!";
                score++;
            } else {
                input.classList.add('wrong');
                feedback.style.color = "#dc3545";
                feedback.innerText = `Wrong! The answer was: ${questions[currentQuestionIndex].answer}`;
            }
            document.getElementById('score-tracker').innerText = `Score: ${score}`;
        }

        // Enter key support
        document.getElementById('userAnswer').addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                if(document.getElementById('submitAnswerBtn').style.display !== 'none') checkAnswer();
                else nextQuestion();
            }
        });

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
            let msg = percentage > 70 ? "Great job!" : "Keep practicing!";
            document.getElementById('feedback-msg').innerText = msg;
        }

        document.getElementById('hamburgerBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });