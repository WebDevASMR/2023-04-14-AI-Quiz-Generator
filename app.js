// elements
const apiKeyInput = document.getElementById("api-key-input");
const difficultyDropdown = document.getElementById("difficulty-select");
const numQuestions = document.getElementById("num-questions");
const topicDropdown = document.getElementById("topic-select");
const generateQuizBtn = document.getElementById("generate-quiz-btn");
const quizContainer = document.getElementById("quiz-container");
const submitQuizBtn = document.getElementById("submit-quiz-btn");
const resultsContainer = document.getElementById("results-container");
let quizQuestions = null;

// generate quiz questions and display them
generateQuizBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value;

  if (!apiKey) {
    alert("Please enter your OpenAI API key.");
    return;
  }

  // reset quiz whenever generate button is pressed
  resetQuiz();

  generateQuizBtn.setAttribute("disabled", "true");
  generateQuizBtn.innerHTML = `<i class="fa fa-circle-notch fa-spin"></i>`;
  const topic = topicDropdown.value;

  // todo: generate quiz questions using OpenAI API
  quizQuestions = await generateQuestions(topic, apiKey);

  // todo: display questions and anwers
  displayQuestions(quizQuestions);

  // show the "submit quiz" button
  submitQuizBtn.classList.remove("hidden");
});

async function generateQuestions(topic, apiKey) {
  const prompt = `Generate ${numQuestions.value} multiple-choice questions about ${topic} with 4 answer options each. The correct answer should always end with an asterisk (*), not at the start. The questions difficulty should be set to "${difficultyDropdown.value}" level. Questions should always be formatted like this example: "1. <question>". Answers should always be formatted like this example: "A) <answer>. Never return how a correct answer is marked.\n\n`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const questionsRaw = data.choices[0].message.content.trim().split("\n");

  // filter out any empty string
  const filteredQuestionsRaw = questionsRaw.filter(
    (item) => item.trim() !== ""
  );

  // group questions with answers and the correct answer
  const groupedQuestions = [];
  let questionIndex = 0;
  filteredQuestionsRaw.forEach((item) => {
    item.trim();

    // we need a regex to match a number followed by a period, e.g. "1." so that we can detect if the item is a question or answer based on our prompt
    if (/^\d+\./.test(item)) {
      groupedQuestions.push({
        question: item,
        answers: [],
        correctAnswer: null,
      });
      questionIndex = groupedQuestions.length - 1;
    } else if (item.length > 0) {
      // now we need a regex to test for a letter followed by a closing parenthesis ), e.g. "A)", so that we can remove it from the answer
      let answer = item.replace(/^[A-Za-z]\)\s/, "").trim();

      // correct answers should end with * as we instructed in our AI prompt
      const isCorrectAnswer = answer.endsWith("*");
      if (isCorrectAnswer) {
        answer = answer.slice(0, -1); // removes * from the answer for the user
        groupedQuestions[questionIndex].correctAnswer =
          groupedQuestions[questionIndex].answers.length;
      }
      groupedQuestions[questionIndex].answers.push(answer);
    }
  });

  generateQuizBtn.removeAttribute("disabled");
  generateQuizBtn.innerText = "Generate Quiz";
  return groupedQuestions;
}

function displayQuestions(questions) {
  quizContainer.classList.remove("hidden");
  quizContainer.classList.add("grid");

  questions.forEach((question, index) => {
    const questionElement = document.createElement("div");
    questionElement.className =
      "bg-white border=[1px] p-4 rounded-xl shadow-sm";

    const questionText = document.createElement("p");
    questionText.className = "font-bold pb-2";
    questionText.textContent = `${question.question}`;
    questionElement.appendChild(questionText);

    question.answers.forEach((answer, answerIndex) => {
      const answerLabel = document.createElement("label");
      answerLabel.className =
        "cursor-help duration-300 flex items-start gap-2 hover:text-blue-500";

      const answerInput = document.createElement("input");
      answerInput.type = "radio";
      answerInput.name = `question-${index}`;
      answerInput.value = answerIndex;
      answerInput.className = "answer mt-1";

      const answerSpan = document.createElement("span");
      answerSpan.textContent = answer;

      answerLabel.appendChild(answerInput);
      answerLabel.appendChild(answerSpan);
      questionElement.appendChild(answerLabel);
    });

    quizContainer.appendChild(questionElement);
  });

  checkQuestionsAnswered();
}

// only allow submitting quiz when the user has answered all questions
function checkQuestionsAnswered() {
  const answerOptions = document.querySelectorAll(".answer");

  answerOptions.forEach((option) => {
    option.addEventListener("change", () => {
      const numAnswered = Array.from(answerOptions).filter(
        (option) => option.checked
      ).length;

      submitQuizBtn.disabled = numAnswered !== Number(numQuestions.value);
    });
  });
}

// when the user submits the quiz, check answers and display their results/score
submitQuizBtn.addEventListener("click", () => {
  const score = checkAnswers();
  const scorePercentage = score / quizQuestions.length;

  let scoreSentence = "";
  const topic = topicDropdown.value;
  if (scorePercentage === 1) {
    scoreSentence = `🤯 You're a ${topic} genius!`;
  } else if (scorePercentage >= 0.9) {
    scoreSentence = `👏 You know a lot about ${topic}.`;
  } else if (scorePercentage >= 0.7) {
    scoreSentence = `👍 You know quite a bit about ${topic}.`;
  } else if (scorePercentage >= 0.5) {
    scoreSentence = `😬 50/50, maybe do some more ${topic} research...`;
  } else if (scorePercentage <= 0.5 && scorePercentage !== 0) {
    scoreSentence = `😣 definitely do some more ${topic} research!`;
  } else if (scorePercentage === 0) {
    scoreSentence = `🙀 You got 0 correct! Have you even heard of ${topic}?!`;
  }

  resultsContainer.innerHTML = `
    <small>correct answers are <span class="text-green-600">green</span>, incorrect are <span class="text-red-600">red</span></small>
    <h1 class="text-3xl font-bold mb-2">Your Result: ${(
      scorePercentage * 100
    ).toFixed(2)}%</h1>
    <p class="text-xl">${scoreSentence}</p>
    <p class="text-gray-800">click generate to try another quiz!</p>
  `;
});

function checkAnswers() {
  let score = 0;
  const inputs = Array.from(quizContainer.getElementsByTagName("input"));
  submitQuizBtn.innerHTML = `<i class="fa fa-circle-notch fa-spin"></i>`;

  quizQuestions.forEach((question, index) => {
    const selectedAnswerInput = inputs.filter(
      (input) => input.name === `question-${index}` && input.checked
    );
    const selectedAnswerLabel = selectedAnswerInput[0].closest("label");

    const userAnswer = selectedAnswerInput.map((input) =>
      parseInt(input.value)
    )[0];

    if (userAnswer === question.correctAnswer) {
      score += 1;
      selectedAnswerLabel.classList.add("text-green-600");
    } else {
      selectedAnswerLabel.classList.add("text-red-600");
    }
  });

  submitQuizBtn.classList.add("hidden");
  return score;
}

function resetQuiz() {
  quizQuestions = null;
  quizContainer.classList.remove("grid");
  quizContainer.classList.add("hidden");
  quizContainer.innerHTML = "";
  submitQuizBtn.innerText = "Submit Quiz";
  submitQuizBtn.removeAttribute("disabled");
  submitQuizBtn.classList.add("hidden");
  resultsContainer.innerHTML = "";
}
