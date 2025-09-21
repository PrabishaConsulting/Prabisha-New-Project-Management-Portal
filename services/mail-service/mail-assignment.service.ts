import { sendMail } from "@/lib/mail";
/**
 * Defines the data required for a task assignment email.
 */
interface TaskAssignmentProps {
  assigneeName: string;
  assigneeEmail: string;
  taskTitle: string;
  assignedBy: string;
  taskUrl: string; // e.g., 'https://yourapp.com/tasks/123'
}

/**
 * Prepares and sends a "Task Assigned" notification email.
 * @param props - The data needed to build the email.
 */
export const sendTaskAssignmentEmail = async (props: TaskAssignmentProps) => {
  const { assigneeName, assigneeEmail, taskTitle, assignedBy, taskUrl } = props;

  const subject = `You've been assigned a new task: "${taskTitle}"`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0d6efd;">New Task Assigned</h2>
      <p>Hi ${assigneeName},</p>
      <p><strong>${assignedBy}</strong> has assigned you a new task:</p>
      <p style="font-size: 1.1em; font-weight: bold;">${taskTitle}</p>
      <p>You can view the details and get started by clicking the button below:</p>
      <a href="${taskUrl}" style="display: inline-block; padding: 12px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
        View Task
      </a>
    </div>
  `;

  // Use the generic sendMail function to send the composed email
  await sendMail({
    to: assigneeEmail,
    subject: subject,
    html: html,
  });
};



// In the same file as your sendTaskAssignmentEmail function

/**
 * Defines the data required for a "task for review" email.
 */
interface TaskForReviewProps {
  reviewerName: string;
  reviewerEmail: string;
  taskTitle: string;
  projectName: string; // The person who moved the task to review
  taskUrl: string;
}

/**
 * Prepares and sends a "Task for Review" notification email.
 * @param props - The data needed to build the email.
 */
export const sendTaskForReviewEmail = async (props: TaskForReviewProps) => {
  const { reviewerName, reviewerEmail, taskTitle, projectName, taskUrl } = props;

  const subject = `Task ready for review: "${taskTitle}"`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #6f42c1;">Task Ready for Review</h2>
      <p>Hi ${reviewerName},</p>
      <p><strong>${projectName}</strong> has submitted the task for your review:</p>
      <p style="font-size: 1.1em; font-weight: bold;">${taskTitle}</p>
      <p>Please review the work and provide feedback or move it to the next stage.</p>
      <a href="${taskUrl}" style="display: inline-block; padding: 12px 20px; background-color: #6f42c1; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
        Review Task
      </a>
    </div>
  `;

  // Assuming you have a generic sendMail function
  await sendMail({
    to: reviewerEmail,
    subject: subject,
    html: html,
  });
};