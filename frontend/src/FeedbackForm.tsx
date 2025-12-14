import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Star, Send, Award, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { feedbackApi } from './api';
import './FeedbackForm.css';

interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

interface FeedbackData {
  participant_name: string;
  participant_email: string;
  event_name: string;
  questions: FeedbackQuestion[];
}

function FeedbackForm() {
  const { token } = useParams<{ token: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!token) {
      setError('Invalid feedback link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }

    // Fetch feedback form data
    feedbackApi.getForm(token)
      .then(res => {
        setFeedbackData(res.data);
        setLoading(false);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('This feedback link has expired or already been used.');
        } else if (err.response?.status === 410) {
          setError('You have already submitted feedback and received your certificate.');
        } else {
          setError('Failed to load feedback form. Please try again later.');
        }
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackData || !token) return;

    // Validate required questions
    const unanswered = feedbackData.questions
      .filter(q => q.required && !answers[q.id])
      .map(q => q.question);
    
    if (unanswered.length > 0) {
      alert(`Please answer the following required questions:\n\n${unanswered.join('\n')}`);
      return;
    }

    setSubmitting(true);

    try {
      await feedbackApi.submit(token, Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        answer: answer
      })));
      setSubmitted(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (loading) {
    return (
      <div className="feedback-page">
        <div className="feedback-loading">
          <Loader className="spinner" size={48} />
          <p>Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-page">
        <div className="feedback-error">
          <Award size={64} />
          <h2>Oops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="feedback-page">
        <motion.div 
          className="feedback-success"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <CheckCircle size={80} className="success-icon" />
          <h1>Thank You!</h1>
          <p>Your feedback has been submitted successfully.</p>
          <p className="certificate-note">
            Your certificate has been sent to <strong>{feedbackData?.participant_email}</strong>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <motion.div 
        className="feedback-container"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="feedback-header">
          <Award size={40} className="feedback-logo" />
          <h1>Feedback Form</h1>
          <p className="feedback-greeting">
            Hi <strong>{feedbackData?.participant_name}</strong>! Please share your feedback to receive your certificate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          {feedbackData?.questions.map((question, index) => (
            <div key={question.id} className="feedback-field">
              <label className="feedback-label">
                <span className="question-num">{index + 1}.</span>
                {question.question}
                {question.required && <span className="required">*</span>}
              </label>

              {question.type === 'text' && (
                <textarea
                  value={answers[question.id] as string || ''}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="feedback-textarea"
                  rows={3}
                />
              )}

              {question.type === 'rating' && (
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      className={`rating-star ${(answers[question.id] as number) >= num ? 'active' : ''}`}
                      onClick={() => setAnswer(question.id, num)}
                    >
                      <Star size={32} fill={(answers[question.id] as number) >= num ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'multiple_choice' && question.options && (
                <div className="choice-input">
                  {question.options.map(option => (
                    <label key={option} className="choice-option">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => setAnswer(question.id, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? (
              <>
                <Loader className="spinner" size={20} />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit & Get Certificate
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default FeedbackForm;
