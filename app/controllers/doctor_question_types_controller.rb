class DoctorQuestionTypesController < ApplicationController
  before_action :set_doctor_question_type, only: %i[ show edit update destroy ]

  # GET /doctor_question_types or /doctor_question_types.json
  def index
    @doctor_question_types = DoctorQuestionType.includes(:doctor_questions).all
  end

  # GET /doctor_question_types/1 or /doctor_question_types/1.json
  def show
  end

  # GET /doctor_question_types/new
  def new
    @doctor_question_type = DoctorQuestionType.new
  end

  # GET /doctor_question_types/1/edit
  def edit
  end

  # POST /doctor_question_types or /doctor_question_types.json
  def create
    @doctor_question_type = DoctorQuestionType.new(doctor_question_type_params)

    respond_to do |format|
      if @doctor_question_type.save
        format.html { redirect_to @doctor_question_type, notice: "Doctor question type was successfully created." }
        format.json { render :show, status: :created, location: @doctor_question_type }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @doctor_question_type.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /doctor_question_types/1 or /doctor_question_types/1.json
  def update
    respond_to do |format|
      if @doctor_question_type.update(doctor_question_type_params)
        format.html { redirect_to @doctor_question_type, notice: "Doctor question type was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @doctor_question_type }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @doctor_question_type.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /doctor_question_types/1 or /doctor_question_types/1.json
  def destroy
    @doctor_question_type.destroy!

    respond_to do |format|
      format.html { redirect_to doctor_question_types_path, notice: "Doctor question type was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_doctor_question_type
      @doctor_question_type = DoctorQuestionType.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def doctor_question_type_params
      params.expect(doctor_question_type: [ :name ])
    end
end
