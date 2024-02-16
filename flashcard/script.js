let currentQuestionIndex = 0;

function toggleCard() {
  const flashcard = document.querySelector('.flashcard');
  flashcard.classList.toggle('flipped');
}

function loadQuestionAndAnswer() {
  const questionElement = document.getElementById('question');
  const answerElement = document.getElementById('answer');

  // Fetch questions and answers from external files
  fetch('questions.txt')
    .then(response => response.text())
    .then(questions => {
      const questionArray = questions.split('\n');
      questionElement.textContent = questionArray[currentQuestionIndex].trim();
    });

  fetch('responses.txt')
    .then(response => response.text())
    .then(responses => {
      const responseArray = responses.split('\n');
      answerElement.textContent = responseArray[currentQuestionIndex].trim();
    });
}

function loadNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= 500) {
    currentQuestionIndex = 0; // Restart from the first question if reaching the end
  }
  loadQuestionAndAnswer();
  // Reset the card to the front when loading a new question
  const flashcard = document.querySelector('.flashcard');
  flashcard.classList.remove('flipped');
}

// Load the first question and answer
loadQuestionAndAnswer();
