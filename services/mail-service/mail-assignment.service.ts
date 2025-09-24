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

interface TaskAssignedForReviewProps {
  reviewerName: string;
  reviewerEmail: string;
  taskTitle: string;
  projectName: string;
  taskUrl: string;
  assignerName: string; // Person who assigned the task for review
  dueDate?: string; // Optional review due date
}

export const sendTaskForReviewEmail = async (props: TaskAssignedForReviewProps) => {
  const { reviewerName, reviewerEmail, taskTitle, projectName, taskUrl, assignerName, dueDate } = props;

  const subject = `New task assigned for review: "${taskTitle}"`;

  const dueDateText = dueDate ? `<p><strong>Review Due Date:</strong> ${dueDate}</p>` : '';

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
      <h2 style="color: #6f42c1; margin-bottom: 20px;">Task Assigned for Review</h2>
      
      <p>Hi ${reviewerName},</p>
      
      <p>You have been assigned to review a task in <strong>${projectName}</strong>.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${taskTitle}</p>
        <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${projectName}</p>
        <p style="margin: 0;"><strong>Assigned by:</strong> ${assignerName}</p>
        ${dueDateText}
      </div>
      
      <p>As the reviewer, you are responsible for:</p>
      <ul style="margin: 15px 0;">
        <li>Reviewing the completed work thoroughly</li>
        <li>Providing constructive feedback if needed</li>
        <li>Approving the task or requesting changes</li>
        <li>Moving the task to the appropriate status</li>
      </ul>
      
      <p>Please click the button below to access the task and begin your review:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${taskUrl}" 
           style="display: inline-block; 
                  padding: 14px 28px; 
                  background-color: #6f42c1; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: bold;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          Start Review →
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        If you have any questions about this task or need additional context, please reach out to ${assignerName} or the project team.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      
      <p style="color: #999; font-size: 12px;">
        This is an automated notification. Please do not reply to this email directly.
      </p>
    </div>
  `;

  // Assuming you have a generic sendMail function
  await sendMail({
    to: reviewerEmail,
    subject: subject,
    html: html,
  });
};