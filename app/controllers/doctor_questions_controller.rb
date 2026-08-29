class DoctorQuestionsController < ApplicationController
  before_action :set_doctor_question, only: %i[ show edit update destroy ]

  # GET /doctor_questions or /doctor_questions.json
  def index
    @doctor_questions = DoctorQuestion.sorted_by(params[:sort], params[:direction])
  end


  # GET /doctor_questions/1 or /doctor_questions/1.json
  def show
  end

  # GET /doctor_questions/new
  def new
    @doctor_question = DoctorQuestion.new
  end

  # GET /doctor_questions/1/edit
  def edit
  end

  # POST /doctor_questions or /doctor_questions.json
  def create
    @doctor_question = DoctorQuestion.new(doctor_question_params)

    respond_to do |format|
      if @doctor_question.save
        format.html { redirect_to @doctor_question, notice: "Doctor question was successfully created." }
        format.json { render :show, status: :created, location: @doctor_question }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @doctor_question.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /doctor_questions/1 or /doctor_questions/1.json
  def update
    respond_to do |format|
      if @doctor_question.update(doctor_question_params)
        format.html { redirect_to @doctor_question, notice: "Doctor question was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @doctor_question }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @doctor_question.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /doctor_questions/1 or /doctor_questions/1.json
  def destroy
    @doctor_question.destroy!

    respond_to do |format|
      format.html { redirect_to doctor_questions_path, notice: "Doctor question was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_doctor_question
      @doctor_question = DoctorQuestion.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def doctor_question_params
      params.expect(doctor_question: [ :question, :doctor_question_type_id ])
    end
end
