module Api
  module V1
    class TasksController < Api::BaseController
      before_action :set_task, only: %i[ show update destroy ]

      def index
        render json: Task.newest_first
      end

      def show
        render json: @task
      end

      def create
        task = Task.new(task_params)

        if task.save
          render json: task, status: :created
        else
          unprocessable(task)
        end
      end

      def update
        if @task.update(task_params)
          render json: @task
        else
          unprocessable(@task)
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private
        def set_task
          @task = Task.find(params[:id])
        end

        def task_params
          params.expect(task: [ :title, :completed ])
        end
    end
  end
end
