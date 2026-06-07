export type Todo = {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  due_date: string | null;
  done: boolean;
  created_at: string;
};

type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_date: string | null;
  progress: number;
  created_at: string;
};

export default { Todo, Goal };
